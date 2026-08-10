import * as fs from 'node:fs';
import * as path from 'node:path';

/**
 * `'use client'` ON EVERY EMITTED ENTRY.
 *
 * React Server Components read the directive per MODULE, and a consumer imports
 * an ENTRY — `@fmmenchi/ui`, `@fmmenchi/ui/button`,
 * `@fmmenchi/ui-form-ports/react-hook-form`. Without it every one of these is a
 * server module to the consumer's bundler, and the first hook inside becomes a
 * build error in somebody else's repository, naming a file they do not own and
 * cannot fix.
 *
 * APPLIED TO THE OUTPUT, not to the source. The directive has to be the first
 * statement of the emitted chunk; sixty-odd barrels would each have to remember
 * it, and the next component added would forget. Here there is nothing to
 * forget.
 *
 * ENTRIES ONLY. A shared chunk reached from a client entry is already inside the
 * client graph — the directive marks the BOUNDARY, and marking more than the
 * boundary says less about where it is.
 *
 * The cost, stated: this makes the whole package client, including the few
 * components that use no hook and could have rendered on the server. Marking
 * only the ones that need it would mean deciding, per component, whether every
 * transitive import is server-safe — a judgement with nothing to check it,
 * which goes stale the first time a component grows a hook. Consumers who care
 * import the subpath rather than the barrel, which is why the subpaths exist.
 *
 * ONLY WHEN A LIBRARY IS BEING BUILT. The plugin lives in the shared `plugins`
 * array, which Storybook's preview build reuses — and that build's entry is an
 * `iframe` bundle, not a published module. Marking it client is meaningless and
 * the read-back check then fails a Storybook build for a rule that does not
 * apply to it, which is exactly what happened. `build.lib` is what tells the
 * two apart.
 *
 * IT READS THE FILE BACK, and that is the part worth keeping: a bundler that
 * began hoisting imports above the banner would otherwise ship a package whose
 * directive is inert, and nothing would say so until a consumer's build failed.
 */
export function useClientPlugin() {
  return {
    name: 'fm-use-client',

    apply: (config, env) =>
      env.command === 'build' && config.build?.lib != null,

    generateBundle(_options, bundle) {
      for (const chunk of Object.values(bundle)) {
        if (chunk.type !== 'chunk' || chunk.isEntry !== true) continue;
        chunk.code = `'use client';\n${chunk.code ?? ''}`;
      }
    },

    writeBundle(options, bundle) {
      const outDir = options.dir ?? 'dist';
      for (const [fileName, chunk] of Object.entries(bundle)) {
        if (chunk.type !== 'chunk' || chunk.isEntry !== true) continue;

        const written = fs.readFileSync(path.join(outDir, fileName), 'utf8');
        if (!/^['"]use client['"];/.test(written)) {
          throw new Error(
            `${fileName} is an entry and does not start with the 'use client' directive. A React Server Components consumer reads it as a server module, and the first hook inside it becomes a build error in their repository rather than ours.`,
          );
        }
      }
    },
  };
}
