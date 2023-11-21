"use client";

import { useRef } from "react";

export function ImportBook() {
  const inputFile = useRef<HTMLInputElement | null>(null);

  const onButtonClick = () => {
    inputFile.current?.click();
  };

  const findElementInHTML = (html: string, elementId: string) => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    return doc.getElementById(elementId);
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

  const onFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (file) {
      const fileContents = await readFileContents(file);
      const element = findElementInHTML(fileContents, "storycontent");
      if (element) {
        console.log("Found element:", element);
      } else {
        console.log("Element not found.");
      }
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
