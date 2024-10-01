# LunAST

Experimental AST processor for the Discord client's Webpack modules.

## Usage

LunAST functions off of "processors". A processor has a unique ID, priority, an optional filter, and a process function. These must be registered in your `index.ts` file ASAP - not in a Webpack module or on the Node/host sides.

```ts
moonlight.lunast.register({
  name: "UniqueIDForTheProcessor",
  find: "something to look for",
  process(state) {
    return false;
  }
});
```

When a `find` is specified, the AST parsing will only be done on modules that match that regex/string(s). `find` is highly suggested, as AST parsing is much more expensive than simple string checks.

The `process` function will be called for every matched module. The state argument contains the LunAST instance, the ID of the matched module, some utilities, and more. When `process` returns true, the processor is unregistered, and will not trigger for future modules. Return true when you have found your desired module(s).

## Utilities

There are various utilities accessible through `state.lunast.utils`.

You can use the `magicAST` function to turn some JavaScript code into another AST node, and then merge/replace the original AST. **After you modify the AST, call the markDirty function.** LunAST will not know to replace the module otherwise. It is suggested you read the [estree-toolkit](https://estree-toolkit.netlify.app/welcome) documentation.

```ts
process({ ast, markDirty, lunast }) {
  const node = /* do something with the AST */;
  if (node != null) {
    const replacement = lunast.utils.magicAST("return 1 + 1");
    node.replaceWith(replacement);
    markDirty();
    return true;
  }

  return false;
}
```

## Embedding into client mods

First, create an instance of LunAST:

```ts
import LunAST from "@moonlight-mod/lunast";
const lunast = new LunAST();
```

Expose this instance to your extensions (before Webpack initializes) so extensions can register custom processors.

You'll then need to set a module source getter, so LunAST can retrieve the source of other modules.

```ts
lunast.setModuleSourceGetter((id) => {
  // assuming `funcs` is a Record<string, WebpackModuleFunc>
  return funcs[id].toString().replace(/\n/g, "");
});
```

Then, when processing a module into the Webpack chunk, give it the script to parse and patch the returned modules:

```ts
const parsed = lunast.parseScript(id, code);
if (parsed != null) {
  for (const [id, script] of Object.entries(parsed)) {
    // Patch module `id` with the contents of `script`
  }
}
```

## TODO

- [x] Publish
- [ ] Release to NPM
