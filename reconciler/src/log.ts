import { appendFileSync, existsSync, mkdirSync, openSync, closeSync, fsyncSync, readFileSync } from "node:fs";
import { dirname } from "node:path";
import { createHash } from "node:crypto";
import type { Event } from "./events.ts";

/** One line of the append-only log. `hash` chains every record to the one before it. */
export interface LogRecord {
  seq: number;
  at: string;
  event: Event;
  prev: string;
  hash: string;
}

const GENESIS = "0".repeat(64);

/** JSON with bigints tagged as {"$n": "..."} and object keys sorted, so hashes are stable. */
export function canonical(value: unknown): string {
  return JSON.stringify(normalise(value));
}

function normalise(value: unknown): unknown {
  if (typeof value === "bigint") return { $n: value.toString() };
  if (Array.isArray(value)) return value.map(normalise);
  if (value !== null && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(value).sort()) {
      const v = (value as Record<string, unknown>)[key];
      if (v !== undefined) out[key] = normalise(v);
    }
    return out;
  }
  return value;
}

export function revive(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(revive);
  if (value !== null && typeof value === "object") {
    const keys = Object.keys(value);
    if (keys.length === 1 && keys[0] === "$n") return BigInt((value as { $n: string }).$n);
    const out: Record<string, unknown> = {};
    for (const key of keys) out[key] = revive((value as Record<string, unknown>)[key]);
    return out;
  }
  return value;
}

export const sha256 = (text: string): string => createHash("sha256").update(text).digest("hex");

function recordHash(prev: string, seq: number, at: string, event: Event): string {
  return sha256(prev + canonical({ seq, at, event }));
}

export interface LogStore {
  readLines(): string[];
  appendLine(line: string): void;
}

export class FileStore implements LogStore {
  private readonly file: string;
  constructor(file: string) {
    this.file = file;
    mkdirSync(dirname(file), { recursive: true });
  }
  readLines(): string[] {
    if (!existsSync(this.file)) return [];
    return readFileSync(this.file, "utf8").split("\n").filter((l) => l.length > 0);
  }
  appendLine(line: string): void {
    appendFileSync(this.file, line + "\n");
    const fd = openSync(this.file, "r");
    try {
      fsyncSync(fd);
    } finally {
      closeSync(fd);
    }
  }
}

export class MemoryStore implements LogStore {
  lines: string[] = [];
  readLines(): string[] {
    return [...this.lines];
  }
  appendLine(line: string): void {
    this.lines.push(line);
  }
}

/** Append-only, hash-chained event log. Refuses to load if any record was changed, removed or reordered. */
export class EventLog {
  private readonly store: LogStore;
  private records: LogRecord[] = [];

  constructor(store: LogStore) {
    this.store = store;
    let prev = GENESIS;
    for (const [i, line] of store.readLines().entries()) {
      let raw;
      try {
        raw = JSON.parse(line);
      } catch {
        throw new Error(`event log broken at record ${i}: the line is not JSON (a write cut short?); see the runbook before editing`);
      }
      const record = { ...raw, event: revive(raw.event) } as LogRecord;
      if (record.seq !== i || record.prev !== prev || record.hash !== recordHash(prev, record.seq, record.at, record.event)) {
        throw new Error(`event log broken at record ${i}: the file was edited or truncated`);
      }
      this.records.push(record);
      prev = record.hash;
    }
  }

  all(): readonly LogRecord[] {
    return this.records;
  }

  append(event: Event, at: string): LogRecord {
    const seq = this.records.length;
    const prev = seq === 0 ? GENESIS : this.records[seq - 1].hash;
    const record: LogRecord = { seq, at, event, prev, hash: recordHash(prev, seq, at, event) };
    this.store.appendLine(canonical(record));
    this.records.push(record);
    return record;
  }

  head(): string {
    return this.records.length === 0 ? GENESIS : this.records[this.records.length - 1].hash;
  }
}
