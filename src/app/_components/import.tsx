"use client";

import { useRef } from "react";
import { saveAs } from "file-saver";
// import  from "file-saver";
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

  const onFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (file) {
      const fileContents = await readFileContents(file);

      const story_element = findIdInHTML(fileContents, "storycontent");
      if (story_element == null) {
        throw new Error("Failed to get storycontent element");
      }

      const author_div = findIdInHTML(fileContents, "content");
      if (author_div == null) {
        throw new Error("Failed to get author div");
      }
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

      ExportEPub(story_element.outerHTML, title + "_" + chapter, author);
    }
  };

  return (
    <div>
      <button onClick={onButtonClick}>Open file upload window</button>

      <input
        type="file"
        id="file"
        ref={inputFile}
        style={{ display: "none" }}
        onChange={onFileChange}
      />
    </div>
  );
}
