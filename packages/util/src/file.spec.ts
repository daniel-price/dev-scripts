import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import fs from "fs";
import { v4 as uuidv4 } from "uuid";

import * as FileUtil from "./file";
import * as R from "./runtypes";

describe("File", () => {
  const directory: string = `${FileUtil.E_DIRECTORIES.DEV_SCRIPTS}test/`;
  let fileName: string;
  beforeEach(() => {
    fileName = `${uuidv4()}.test`;
  });

  afterEach(() => {
    const filePath = `${directory ? directory : ""}${fileName}`;
    fs.rmSync(filePath);
  });
  describe("should write and read the same content when it", () => {
    it("is json", () => {
      const set1 = new Set<number>();
      set1.add(1);
      set1.add(2);
      set1.add(3);

      const set2 = new Set<number>();
      set2.add(1);
      set2.add(2);
      set2.add(3);

      const map1 = new Map<string, number>();
      map1.set("1", 1);
      map1.set("2", 2);
      map1.set("3", 3);

      const map2 = new Map<string, number>();
      map2.set("1", 1);
      map2.set("2", 2);
      map2.set("3", 3);

      type Result = {
        string: string;
        number: number;
        set: Set<number>;
        map: Map<string, number>;
        array: number[];
      };

      const results: Record<string, Result> = {
        result1: {
          string: "1",
          number: 1,
          set: set1,
          map: map1,
          array: [1, 2, 3, 4, 5],
        },
        result2: {
          string: "2",
          number: 2,
          set: set2,
          map: map2,
          array: [1, 2, 3, 4, 5],
        },
      };

      const count = Object.keys(results).length;
      const json = { results, count };

      FileUtil.write(fileName, json, { directory });
      const readJson = FileUtil.readJson(
        fileName,
        R.Record({
          results: R.Dictionary(
            R.Record({
              string: R.String,
              number: R.Number,
              set: R.SetOf(R.Number),
              map: R.MapOf(R.String, R.Unknown),
              array: R.Array(R.Number),
            }),
            R.String,
          ),
          count: R.Number,
        }),
        { directory },
      );

      //check types work correctly
      for (const [key, value] of Object.entries(readJson.results)) {
        const res = results[key];
        expect(value.string).toEqual(res.string);
        expect(value.number).toEqual(res.number);
        expect(value.set).toEqual(res.set);
        expect(value.map).toEqual(res.map);
        expect(value.array).toEqual(res.array);
      }

      expect(readJson).toEqual(json);
    });

    it("is a csv", () => {
      const results = [
        {
          string: "string1",
          number: 1,
        },
        {
          string: "string2",
          number: 2,
        },
      ];

      FileUtil.writeCsv(fileName, results, { directory });

      const readCsv = FileUtil.readCsv(
        fileName,
        R.Record({ string: R.String, number: R.Number }),
        { directory },
      );

      expect(readCsv).toEqual(results);
    });

    it("is just lines", () => {
      const results = [
        "result 1",
        "result 2",
        "result 3",
        "result 4",
        "result 5",
      ];

      for (const result of results) {
        FileUtil.write(fileName, result, { directory, append: true });
      }

      const readLines = FileUtil.readLines(fileName, R.String, { directory });

      expect(readLines).toEqual(results);
    });
  });
});
