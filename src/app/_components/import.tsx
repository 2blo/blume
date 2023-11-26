"use client";

import { useRef } from "react";
import { saveAs } from "file-saver";
import * as React from 'react';
import url from "url";
import epub from "epub-gen-memory/bundle";

export function ImportBook() {
  const inputFile = useRef<HTMLInputElement | null>(null);

  const onButtonClick = () => {
    inputFile.current?.click();
  };

  const findIdInHTML = (html: string, elementId: string) => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    return doc.getElementById(elementId);
  };

  const findTagInHTML = (html: string, tag: string) => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    return doc.getElementsByTagName(tag);
  };
  const findClassNameInHTML = (html: string, className: string) => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    return doc.getElementsByClassName(className);
  };

  const readFileContents = (file: File) => {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = () => {
        const result = reader.result;

        if (result && typeof result === "string") {
          resolve(result);
        } else {
          reject(new Error("Failed to read file contents."));
        }
      };

      reader.onerror = () => {
        reject(new Error("Error reading file."));
      };

      reader.readAsText(file);
    });
  };

  const ExportEPub = (htmlContent: string, title: string, author: string) => {
    const option = {
      title: title,
      author: author,
    } as const;
    const content = [
      {
        content: htmlContent,
      },
    ];
    epub(option, content).then(
      (content) => saveAs(content, title + ".epub"),
      (err) => console.error("Failed to generate Ebook because of ", err),
    );
  };

  function getStoryElement(fileContents: string) {
    const story_content = findIdInHTML(fileContents, "storycontent");
    if (story_content != null) {
      return story_content
    }
    const story_text = findIdInHTML(fileContents, "storytext");
    if (story_text != null) {
      return story_text
    }
    throw new Error("Failed to get storycontent element");

  }

  function getAuthorDiv(fileContents: string) {
    const idCandidates = ["content", "profile_top"]
    for (const id of idCandidates) {
      const author_div = findIdInHTML(fileContents, id);
      if (author_div != null) {
        return author_div
      }
    }
    throw new Error("Failed to get author div");

  }

  function getEdgeChapter(fileContents: string) {
    const buttons = findClassNameInHTML(fileContents, "btn");
    const chapterButton = Array.from(buttons).filter(
      (button) => button.localName == "span",
    )[0];
    if (chapterButton == null) {
      throw new Error("Failed to get chapter button");
    }
    const chapterElement = findTagInHTML(chapterButton.outerHTML, "a")[0];
    if (chapterElement == null) {
      throw new Error("Failed to get chapter anchor");
    }
    const chapterAnchor = chapterElement as HTMLAnchorElement;
    const chapterUrl = url.parse(chapterAnchor.href, true);
    const chapter = chapterUrl.query.chapter;
    if (typeof chapter !== "string") {
      throw new Error("Failed to get chapter");
    }
    return chapter
  }

  function getChromeChapter(fileContents: string) {
    const chapterElement = findIdInHTML(fileContents, "chap_select");
    if (chapterElement == null) {
      throw new Error("Failed to get chapter selector");
    }
    const chapterSelector = chapterElement as HTMLSelectElement;
    return chapterSelector.options[chapterSelector.selectedIndex]?.value;
  }

  function getChapter(fileContents: string) {
    const chapterGetters = [getEdgeChapter, getChromeChapter]
    for (const chapterGetter of chapterGetters) {
      try {
        return chapterGetter(fileContents)
      } catch {

      }
    }
    throw new Error("Failed to get chapter")

  }

  function getStoryAndAuthor(fileContents: string) {

    const story_element = getStoryElement(fileContents)

    const author_div = getAuthorDiv(fileContents)


    const author_anchor = findTagInHTML(author_div.outerHTML, "a");
    const author = author_anchor[0]?.textContent;
    if (author == null) {
      throw new Error("Failed to get author");
    }

    const title_bold = findTagInHTML(author_div.outerHTML, "b");
    const title = title_bold[0]?.textContent;
    if (title == null) {
      throw new Error("Failed to get title");
    }

    const chapter = getChapter(fileContents)

    return {
      "story_element": story_element,
      "title": title,
      "chapter": chapter,
      "author": author,
    }

  }

  async function combineChapters(files: FileList) {
    const containerDiv = document.createElement('div');
    const chapters = []
    for (const file of files) {
      const fileContents = await readFileContents(file);
      const story = getStoryAndAuthor(fileContents)
      chapters.push(story)
      containerDiv.appendChild(story.story_element);
    }
    const firstChapter = chapters[0]
    if (firstChapter === undefined) {
      throw new Error("Please select at least 1 chapter")
    }
    return {
      "story_element": containerDiv,
      "title": firstChapter.title,
      "author": firstChapter.author,
    }
  }

  const onFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;

    if (files == null) {
      throw new Error("Please choose files")
    }
    const book = await combineChapters(files)

    ExportEPub(book.story_element.outerHTML, book.title, book.author);
  };

  return (
    <div>
      <button onClick={onButtonClick}>Open file upload window</button>

      <input
        type="file"
        id="file"
        multiple
        ref={inputFile}
        style={{ display: "none" }}
        onChange={onFileChange}
      />
    </div>
  );
}
