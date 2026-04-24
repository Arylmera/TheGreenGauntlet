import { promises as fs } from 'node:fs';
import path from 'node:path';

export class JsonStore<T> {
  constructor(private readonly file: string) {}

  async load(): Promise<T | null> {
    try {
      const raw = await fs.readFile(this.file, 'utf8');
      return JSON.parse(raw) as T;
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') return null;
      throw err;
    }
  }

  async save(value: T): Promise<void> {
    const tmp = `${this.file}.tmp`;
    await fs.mkdir(path.dirname(this.file), { recursive: true });
    await fs.writeFile(tmp, JSON.stringify(value), 'utf8');
    await fs.rename(tmp, this.file);
  }
}

export async function ensureWritableDir(dir: string): Promise<void> {
  await fs.mkdir(dir, { recursive: true });
  const probe = path.join(dir, '.write-probe');
  await fs.writeFile(probe, '');
  await fs.unlink(probe);
}
