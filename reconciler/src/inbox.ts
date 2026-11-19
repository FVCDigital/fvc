import { mkdirSync, readdirSync, readFileSync, writeFileSync, renameSync } from "node:fs";
import { join } from "node:path";
import type { RawDelivery } from "./types.ts";

/** Where raw partner deliveries wait. The reconciler only reads; it tracks what it processed in its log. */
export interface DeliverySource {
  list(): RawDelivery[];
}

export class MemoryInbox implements DeliverySource {
  items: RawDelivery[] = [];
  push(...d: RawDelivery[]): void {
    this.items.push(...d);
  }
  list(): RawDelivery[] {
    return [...this.items];
  }
}

/** One JSON file per delivery ({headers, body, receivedAt}), processed in file-name order. */
export class DirectoryInbox implements DeliverySource {
  private readonly dir: string;
  constructor(dir: string) {
    this.dir = dir;
    mkdirSync(dir, { recursive: true });
  }
  list(): RawDelivery[] {
    return readdirSync(this.dir)
      .filter((f) => f.endsWith(".json"))
      .sort()
      .map((f) => {
        const raw = JSON.parse(readFileSync(join(this.dir, f), "utf8"));
        return { headers: raw.headers ?? {}, body: String(raw.body ?? ""), receivedAt: String(raw.receivedAt ?? "") };
      });
  }
  /** Used by the mock feed and by whatever receives the partner's webhooks. Writes atomically. */
  write(name: string, delivery: RawDelivery): void {
    const tmp = join(this.dir, `.${name}.tmp`);
    writeFileSync(tmp, JSON.stringify(delivery, null, 2));
    renameSync(tmp, join(this.dir, `${name}.json`));
  }
}
