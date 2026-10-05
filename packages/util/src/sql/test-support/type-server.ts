import path from "node:path";
import ts from "typescript";
import { isNonNil, pickKeys } from "../../util";
import { Util } from "../../..";

// 1. Add TypeScript definitions
declare global {
  interface Performance {
    log(logger: typeof console | any, format: "array" | "table"): void;
    end(): void;
  }
}

Performance.prototype.end = function () {
  performance.mark("end");
};

// 2. Attach the smart log method
Performance.prototype.log = function (logger, format) {
  const marks = this.getEntriesByType("mark");
  if (marks[marks.length - 1].name !== "end") {
    performance.end();
  }

  if (marks.length === 0) return logger.log("No marks recorded.");

  const firstStartTime = marks[0].startTime;
  const totalDuration = marks[marks.length - 1].startTime - firstStartTime;

  // Process data to calculate durations between marks
  const processed = marks
    .map((mark, index) => {
      const nextMark = marks[index + 1];

      // Duration is the time until the next mark, or 0 if it's the final mark
      const durationMs = nextMark ? nextMark.startTime - mark.startTime : 0;
      const durationPercent =
        totalDuration > 0 ? (durationMs / totalDuration) * 100 : 0;

      // Relative timeline position from the start of the first mark
      const timelineTime = (mark.startTime - firstStartTime) / 1000;

      const isEndMark = mark.name === "end";
      if (isEndMark) return;

      return {
        name: mark.name,
        entryType: mark.entryType,
        startTime: Util.toDecimalPlaces(mark.startTime - firstStartTime, 3),
        timelineTime: timelineTime.toFixed(4),
        duration: Util.toDecimalPlaces(durationMs, 3),

        durationMs,
        percent: Util.toDecimalPlaces(durationPercent, 3),
      };
    })
    .filter(isNonNil);

  // --- Format Option 1: Modified Array ---
  if (format === "array") {
    const outputArray = processed.map((p) => ({
      detail: null,
      name: p.name,
      entryType: p.entryType,
      startTime: p.startTime,
      duration: p.durationMs,
    }));
    logger.info(outputArray);
    return;
  }

  // --- Format Option 2: ASCII Table ---
  if (format === "table") {
    const table = processed.map((p) =>
      pickKeys(p, ["startTime", "name", "duration", "percent"]),
    );
    printAlignedTable(table);
  }
};

// 1. Persistent cache structures held outside the function scope
let cachedService: ts.LanguageService | null = null;
const fileChangeMap = new Map<string, { source: string; version: number }>();

export function getCompletionsFromProject(
  relativeDir: string, // e.g. "src/sql"
  code: string, // must contain "|"
  marker = "|",
) {
  const root = process.cwd();
  const testFile = path.resolve(root, relativeDir, "__completion_test__.ts");
  const pos = code.indexOf(marker);
  const source = code.replace(marker, "");

  // Update or set the virtual overlay file state with an incremented version
  const current = fileChangeMap.get(testFile) || { source: "", version: 0 };
  const nextVersion =
    current.source !== source ? current.version + 1 : current.version;
  fileChangeMap.set(testFile, { source, version: nextVersion });

  // 2. Initialise the Service ONCE and reuse it on subsequent calls
  if (!cachedService) {
    performance.mark("creating host");

    const configPath = path.join(root, "packages", "tsconfig.json");
    const { config } = ts.readConfigFile(configPath, ts.sys.readFile);
    const parsed = ts.parseJsonConfigFileContent(config, ts.sys, root);

    const host: ts.LanguageServiceHost = {
      // Always include the dynamic testFile in compilation targets
      getScriptFileNames: () => [
        testFile,
        ...parsed.fileNames.filter((f) => !f.endsWith(".spec.ts")),
      ],
      // Crucial: Changing this version triggers incremental type checking
      getScriptVersion: (fileName) => {
        return fileChangeMap.get(fileName)?.version.toString() ?? "0";
      },
      getScriptSnapshot: (fileName) => {
        const cached = fileChangeMap.get(fileName);
        if (cached) return ts.ScriptSnapshot.fromString(cached.source);

        const text = ts.sys.readFile(fileName);
        return text !== undefined
          ? ts.ScriptSnapshot.fromString(text)
          : undefined;
      },
      getCurrentDirectory: () => root,
      getCompilationSettings: () => parsed.options,
      getDefaultLibFileName: (opts) => ts.getDefaultLibFilePath(opts),
      fileExists: ts.sys.fileExists,
      readFile: (f) => fileChangeMap.get(f)?.source ?? ts.sys.readFile(f),
      directoryExists: ts.sys.directoryExists,
      getDirectories: ts.sys.getDirectories,
      realpath: ts.sys.realpath,
    };

    performance.mark("creating languageService");
    cachedService = ts.createLanguageService(host);
  } else {
    // Skip host & service creation logs if we hit the cache
    performance.mark("creating host");
    performance.mark("creating languageService");
  }

  performance.mark("creating completions");
  // 3. Fast incremental compilation lookup
  const completions = cachedService.getCompletionsAtPosition(testFile, pos, {});

  performance.end();
  performance.log(console, "table");

  return completions;
}

Performance.prototype.log = function (logger, format) {
  const marks = this.getEntriesByType("mark");
  if (marks[marks.length - 1].name !== "end") {
    performance.end();
  }

  if (marks.length === 0) return logger.log("No marks recorded.");

  const firstStartTime = marks[0].startTime;
  const totalDuration = marks[marks.length - 1].startTime - firstStartTime;

  // Process data to calculate durations between marks
  const processed = marks
    .map((mark, index) => {
      const nextMark = marks[index + 1];

      // Duration is the time until the next mark, or 0 if it's the final mark
      const durationMs = nextMark ? nextMark.startTime - mark.startTime : 0;
      const durationPercent =
        totalDuration > 0 ? (durationMs / totalDuration) * 100 : 0;

      // Relative timeline position from the start of the first mark
      const timelineTime = (mark.startTime - firstStartTime) / 1000;

      const isEndMark = mark.name === "end";
      if (isEndMark) return;

      return {
        name: mark.name,
        entryType: mark.entryType,
        startTime: Util.toDecimalPlaces(mark.startTime - firstStartTime, 3),
        timelineTime: timelineTime.toFixed(4),
        duration: Util.toDecimalPlaces(durationMs, 3),

        durationMs,
        percent: Util.toDecimalPlaces(durationPercent, 3),
      };
    })
    .filter(isNonNil);

  // --- Format Option 1: Modified Array ---
  if (format === "array") {
    const outputArray = processed.map((p) => ({
      detail: null,
      name: p.name,
      entryType: p.entryType,
      startTime: p.startTime,
      duration: p.durationMs,
    }));
    logger.info(outputArray);
    return;
  }

  // --- Format Option 2: ASCII Table ---
  if (format === "table") {
    // Generate the bar chart inside printAlignedTable alongside formatting
    printAlignedTable(processed);
  }
};

function printAlignedTable(data: Array<Record<string, any>>, precision = 4) {
  const MAX_BAR_WIDTH = 30; // Total width allocated for the bar chart column

  const formattedData = data.map((row) => {
    // 1. Calculate the ASCII bar characters dynamically
    const rawPercent =
      typeof row.percent === "number"
        ? row.percent
        : parseFloat(row.percent || 0);
    let barStr = "";

    if (rawPercent > 0) {
      // Scale standard blocks, ensuring huge outliers don't break width limits
      const fullBlocksCount = Math.min(
        MAX_BAR_WIDTH,
        Math.round((rawPercent / 100) * MAX_BAR_WIDTH),
      );

      // Fallback: If duration is greater than zero but too tiny to register a whole block,
      // give it a 1-character fractional anchor so it remains visible.
      if (fullBlocksCount === 0) {
        barStr = "▏";
      } else {
        barStr = "█".repeat(fullBlocksCount);
      }
    }

    // Left-align the bar chart strings so they cleanly line up together like a timeline graph
    const timelineBar = barStr.padEnd(MAX_BAR_WIDTH, " ");

    // 2. Format and pad metrics cleanly
    const formatNum = (val: any) => {
      const num = typeof val === "number" ? val : parseFloat(val);
      return isNaN(num)
        ? String(val)
        : num.toFixed(precision).padStart(10, " ");
    };

    // 3. Assemble fields explicitly in reading order for console.table
    return {
      "Start Time (ms)": formatNum(row.startTime),
      "Duration (ms)": formatNum(row.duration),
      "Percent (%)": formatNum(row.percent),
      "Timeline Visual": timelineBar,
      "Step Name": row.name,
    };
  });

  console.table(formattedData);
}

//TODO - split into:
//- formatting (e.g. align numbers, add bar chart /timeline visuals)
//- printing table (e.g. align numbers, add bar chart /timeline visuals)
