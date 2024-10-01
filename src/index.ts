import { parseFixed } from "./utils";
import { generate } from "astring";
import { Program } from "estree-toolkit/dist/generated/types";
import * as utils from "./utils";

export type ASTProcessor = {
  name: string;
  find?: (string | RegExp)[] | (string | RegExp);
  priority?: number;
  manual?: boolean;
  process: (state: ASTProcessorState) => boolean;
};
export type ASTProcessorState = {
  id: string;
  ast: Program;
  lunast: LunAST;
  markDirty: () => void;
  trigger: (id: string, tag: string) => void;
};

export default class LunAST {
  private processors: ASTProcessor[];
  private successful: Set<string>;
  private getModuleSource?: (id: string) => string;

  elapsed: number;

  constructor() {
    this.processors = [];
    this.successful = new Set();
    this.elapsed = 0;
  }

  public register(processor: ASTProcessor) {
    this.processors.push(processor);
  }

  public parseScript(id: string, code: string): Record<string, string> {
    const start = performance.now();

    const available = [...this.processors]
      .sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0))
      .filter((x) => {
        if (x.find == null) return true;
        const finds = Array.isArray(x.find) ? x.find : [x.find];
        return finds.every((find) =>
          typeof find === "string" ? code.indexOf(find) !== -1 : find.test(code)
        );
      })
      .filter((x) => x.manual !== true);

    const ret = this.parseScriptInternal(id, code, available);

    const end = performance.now();
    this.elapsed += end - start;

    return ret;
  }

  private parseScriptInternal(
    id: string,
    code: string,
    processors: ASTProcessor[]
  ) {
    const ret: Record<string, string> = {};
    if (processors.length === 0) return ret;

    // Wrap so the anonymous function is valid JS
    const module = parseFixed(`(\n${code}\n)`);
    let dirty = false;
    const state: ASTProcessorState = {
      id,
      ast: module,
      lunast: this,
      markDirty: () => {
        dirty = true;
      },
      trigger: (id, tag) => {
        const source = this.getModuleSourceById(id);
        if (source == null) return;
        if (this.successful.has(tag)) return;
        const processor = this.processors.find((x) => x.name === tag);
        if (processor == null) return;
        const theirRet = this.parseScriptInternal(id, source, [processor]);
        Object.assign(ret, theirRet);
      }
    };

    for (const processor of processors) {
      if (processor.process(state)) {
        this.processors.splice(this.processors.indexOf(processor), 1);
        this.successful.add(processor.name);
      }
    }

    let str = dirty ? generate(module) : null;

    if (str != null) {
      // generate adds an extra ; for some reason
      const lastSemicolon = str.lastIndexOf(";");
      if (lastSemicolon !== -1) str = str.slice(0, lastSemicolon);
      ret[id] = str;
    }

    return ret;
  }

  public setModuleSourceGetter(getSource: (id: string) => string) {
    this.getModuleSource = getSource;
  }

  public getModuleSourceById(id: string) {
    return this.getModuleSource?.(id) ?? null;
  }

  get utils() {
    return utils;
  }
}

import type * as AST from "estree-toolkit/dist/generated/types";
export type { AST };
