import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { dirname } from 'path';
import { randomUUID } from 'crypto';

type Query = Record<string, any>;
type UpdateDoc = { $set?: Record<string, any> };

export default class FileDatastore {
  private path: string;
  private map: Record<string, any> = {};

  constructor(opts: { filename: string; autoload?: boolean }) {
    // store to a JSON file (replace .db with .json)
    this.path = opts.filename.replace(/\.db$/, '.json');
    const dir = dirname(this.path);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

    // Try migrate from existing NeDB NDJSON if JSON doesn't exist
    const ndjsonExists = existsSync(opts.filename);
    const jsonExists = existsSync(this.path);

    if (jsonExists) {
      this.load();
    } else if (ndjsonExists) {
      try {
        const raw = readFileSync(opts.filename, 'utf8');
        for (const line of raw.split(/\r?\n/)) {
          const t = line.trim();
          if (!t) continue;
          try {
            const obj = JSON.parse(t);
            if (!obj._id) obj._id = randomUUID();
            this.map[obj._id] = obj;
          } catch {}
        }
        this.save();
      } catch {
        // if anything goes wrong, just start fresh
        this.map = {};
        this.save();
      }
    } else {
      this.save();
    }
  }

  private load() {
    try {
      const txt = readFileSync(this.path, 'utf8');
      this.map = JSON.parse(txt);
    } catch {
      this.map = {};
    }
  }

  private save() {
    writeFileSync(this.path, JSON.stringify(this.map, null, 2), 'utf8');
  }

  private matches(doc: any, query: Query): boolean {
    if (!query || Object.keys(query).length === 0) return true;
    for (const key of Object.keys(query)) {
      const cond = (query as any)[key];
      if (cond && typeof cond === 'object' && '$in' in cond) {
        if (!cond.$in.includes(doc[key])) return false;
      } else {
        if (doc[key] !== cond) return false;
      }
    }
    return true;
  }

  private all(): any[] {
    return Object.values(this.map);
  }

  public find(query: Query, cb: (err: any, docs?: any[]) => void) {
    try {
      const out = this.all().filter((d) => this.matches(d, query));
      cb(null, out);
    } catch (e) {
      cb(e as any);
    }
  }

  public findOne(query: Query, cb: (err: any, doc?: any | null) => void) {
    try {
      const out = this.all().find((d) => this.matches(d, query)) || null;
      cb(null, out);
    } catch (e) {
      cb(e as any);
    }
  }

  public insert(doc: any, cb: (err: any, newDoc?: any) => void) {
    try {
      if (!doc._id) doc._id = randomUUID();
      this.map[doc._id] = doc;
      this.save();
      cb(null, doc);
    } catch (e) {
      cb(e as any);
    }
  }

  public update(
    query: Query,
    updateDoc: UpdateDoc,
    opts: { multi?: boolean },
    cb: (err: any, numReplaced?: number) => void,
  ) {
    try {
      const list = this.all().filter((d) => this.matches(d, query));
      const toUpdate = opts?.multi ? list : list.slice(0, 1);
      const set = updateDoc?.$set ?? {};
      let count = 0;
      for (const d of toUpdate) {
        Object.assign(d, set);
        this.map[d._id] = d;
        count++;
      }
      if (count) this.save();
      cb(null, count);
    } catch (e) {
      cb(e as any);
    }
  }

  public remove(
    query: Query,
    opts: { multi?: boolean },
    cb: (err: any, numRemoved?: number) => void,
  ) {
    try {
      const list = this.all().filter((d) => this.matches(d, query));
      const toRemove = opts?.multi ? list : list.slice(0, 1);
      let count = 0;
      for (const d of toRemove) {
        if (d && d._id && this.map[d._id]) {
          delete this.map[d._id];
          count++;
        }
      }
      if (count) this.save();
      cb(null, count);
    } catch (e) {
      cb(e as any);
    }
  }
}
