import { beforeEach, describe, expect, it, vi } from "vitest";

const { writeFile, readFile, deleteFile } = vi.hoisted(() => ({
  writeFile: vi.fn(),
  readFile: vi.fn(),
  deleteFile: vi.fn(),
}));

vi.mock("@/lib/edition", () => ({
  isIosBuild: true,
}));

vi.mock("@capacitor/filesystem", () => ({
  Directory: { Data: "DATA" },
  Encoding: { UTF8: "utf8" },
  Filesystem: {
    writeFile: (...args: unknown[]) => writeFile(...args),
    readFile: (...args: unknown[]) => readFile(...args),
    deleteFile: (...args: unknown[]) => deleteFile(...args),
  },
}));

import { encodeLocalSave } from "./saveCodec";
import {
  IOS_SAVE_FILE,
  clearIosSaveFile,
  readIosSaveFile,
  writeIosSaveFile,
} from "./iosSaveAdapter";

describe("iosSaveAdapter", () => {
  beforeEach(() => {
    writeFile.mockReset();
    readFile.mockReset();
    deleteFile.mockReset();
    writeFile.mockResolvedValue(undefined);
    deleteFile.mockResolvedValue(undefined);
  });

  it("writes the encoded blob to the app sandbox", async () => {
    await writeIosSaveFile("ADC2:abc");
    expect(writeFile).toHaveBeenCalledWith({
      path: IOS_SAVE_FILE,
      data: "ADC2:abc",
      directory: "DATA",
      encoding: "utf8",
    });
  });

  it("reads and decodes the sandbox file", async () => {
    const encoded = encodeLocalSave({
      gameState: { playTime: 12 },
    } as never);
    readFile.mockResolvedValue({ data: encoded });
    const save = await readIosSaveFile();
    expect(save?.gameState.playTime).toBe(12);
  });

  it("returns null when the file is missing", async () => {
    readFile.mockRejectedValue(new Error("File does not exist"));
    expect(await readIosSaveFile()).toBeNull();
  });

  it("clears the sandbox file", async () => {
    await clearIosSaveFile();
    expect(deleteFile).toHaveBeenCalledWith({
      path: IOS_SAVE_FILE,
      directory: "DATA",
    });
  });
});
