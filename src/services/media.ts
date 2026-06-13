import * as FileSystem from "expo-file-system/legacy";
import * as ImageManipulator from "expo-image-manipulator";

export const optimizeImageForUpload = async (uri: string) => {
  return ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: 1440 } }],
    {
      compress: 0.72,
      format: ImageManipulator.SaveFormat.JPEG,
      base64: true,
    },
  );
};

export const base64ToArrayBuffer = (base64: string) => {
  const binaryString = atob(base64);
  const length = binaryString.length;
  const bytes = new Uint8Array(length);
  for (let index = 0; index < length; index += 1) {
    bytes[index] = binaryString.charCodeAt(index);
  }
  return bytes.buffer;
};

export const readLocalFileAsBase64 = async (uri: string) => {
  return FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
};

export const remoteUrlToBase64 = async (url: string) => {
  const response = await fetch(url);
  const blob = await response.blob();
  const reader = new FileReader();

  return new Promise<string>((resolve, reject) => {
    reader.onloadend = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        reject(new Error("Failed to convert file."));
        return;
      }
      const [, base64 = ""] = result.split(",");
      resolve(base64);
    };
    reader.onerror = () => reject(new Error("Failed to read remote file."));
    reader.readAsDataURL(blob);
  });
};
