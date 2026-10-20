# History Cleanup Plan

## Goal

Reduce repository size and create a history that is easy to edit with
`rebase --root -i`. Keep the base, site implementation, permanent pages,
photo gallery, finds, and individual texts separate. Preserve the final state
of all files included in the agreed source snapshot, except that all
`AGENTS.md` files are deliberately excluded from the new `main`. Keep those
files in the backup repository. Also exclude the unfinished Nobel Prize find
from every new commit; retain its original file in the backup and its local
working draft at `drafts/nobel-prize.md` (ignored by Git).

The shared layers are `Base`, `Site`, `Pages`, `Finds`, and `Photos`, followed
by one commit per text. The current inventory produces **10 commits**.

This document describes preparation and execution. Editing it does not start
the history rewrite or publish any commits.

## Upstream Base

Use an explicitly cleaned snapshot of
`https://github.com/antfu/antfu.me.git`. Create a new root commit with no parents;
do not inherit the old upstream commit chain.

The following commits are available locally:

```text
upstream: e3ff0442327a24b1f389982a19ec8aca704d9245
original main: 9abd62cfe227ba418c558ca26b90acb6fc22fa57
```

The source SHA identifies the last committed `main` observed on 2026-10-19.
It does **not** include the pending working tree changes, new OG images, or
this currently untracked plan. Capture the complete intended source state and
record its commit and tree IDs in the backup repository before executing the
rewrite. Keep that source fixed throughout the operation; do not embed a
snapshot commit ID into a file contained by that same snapshot.

The upstream SHA is a selected snapshot, not a claim that it is the latest
GitHub revision or DG's historical fork point.

Record the upstream URL, full SHA, and excluded personal content in the body
of `Base`. Preserve applicable license and attribution information. A copied
snapshot does not establish Git ancestry with upstream; future upstream
changes will require comparison and adaptation.

Clean the snapshot **before committing Base**. Use an explicit allowlist.
Do not import everything and delete unwanted assets in a later commit:
those assets would remain in the new history. Upstream posts, photographs,
demos, social cards, talk data, and other personal material must not enter any
new commit unless already part of the agreed DG source snapshot.

## Commit Order and Names

Use short subjects without `feat`, `chore`, scopes, numbering, or technology
lists. Put any necessary details in the commit body.

| Order | Subject | Contents |
| --- | --- | --- |
| 1 | `Base` | Cleaned technical foundation from antfu. |
| 2 | `Site` | Current DG implementation, UI translations, shared visuals, configuration, and tooling. |
| 3 | `Pages` | Permanent pages in all existing locales and related data. |
| 4 | `Finds` | External and internal finds, plus section pages. |
| 5 | `Photos` | Gallery images, their order, and committed metadata. |
| 6 | `Colophon` | Text, all existing translations, and its OG image. |
| 7 | `Who is Teslak` | Text, all existing translations, and the avatar collage. |
| 8 | `Robophobia` | Text, all existing translations, and its OG image. |
| 9 | `No single language` | Text, all existing translations, illustration, and OG image. |
| 10 | `Sample clip` | The existing English clipping. |

`Photos` comes before texts so gallery images are available to publications
using `PhotoShowcase`. Images belonging to an individual text enter with that
text. A separate `Images` commit is unnecessary: current images outside the
gallery belong either to the site or to a specific text.

### Base

Include only the needed upstream components, styles, configuration, and tools
in their upstream versions. Each included file needs a clear role in the
foundation; merely existing in upstream is insufficient.

Pay particular attention to `photos/`, `demo/`, `data/`, `pages/`,
`public/images/`, `public/og/`, avatars, logos, profiles, funding settings,
and personal links. Use an allowlist rather than relying on known deletions.

### Site

- `src/`, excluding data assigned to `Pages` or `Finds`.
- All of `src/locales/`: UI translations belong to the implementation;
  translations of individual texts belong with those texts.
- `scripts/`, `build/`, and `patches/`, including media processing tools.
- `photos/model.ts` and `photos/data.ts`: gallery types and loading logic.
- Shared visuals: `public/avatar.avif`, `public/logo.svg`,
  `public/logo.png`, `public/favicon.svg`, and the current `public/og.jpg`.
- `public/images/npm-esm-vs-cjs-sample.svg`: the technical template's example
  diagram.
- `public/admin/index.html`, `public/admin/config.yml`, and
  `public/audio/.gitkeep`.
- Current configuration and support files: `package.json`, lockfile,
  workspace configuration, TypeScript, Vite, UnoCSS, `eslint.config.js`,
  `externals.d.ts`, `shims.d.ts`, `index.html`, `.gitignore`, `.github/`,
  `.vscode/`, and documentation.
- Netlify files: `netlify.toml`, `netlify/`, `_redirects`, and
  `_dist_redirects`.
- `photos/README.md` and this history plan. Exclude every `AGENTS.md` file
  from every new commit; preserve them in `dg-bu` instead.
- Infrastructure routes: `pages/index.vue`, `pages/404.md`, and root and
  localized `[...404].md` files.
- `pages/en/(content)/template.md`: a technical example with `type: draft`,
  rather than a separate publication.

Include the pending JPEG/PNG OG support, default image changes in SEO and RSS,
background keyboard navigation, and the updated logo animation here. On hover
or keyboard focus, the logo retracts along its line and immediately draws
again in one cycle, respecting reduced motion. The root `public/og.png` is
being replaced by `public/og.jpg`; the old default must not remain in the final
tree.

Bring the technical foundation to the agreed DG source state, including
deletions of obsolete upstream files. Copying current files over the base
without handling deletions is insufficient.

### Pages

- `pages/<locale>/index.md`, `now.md`, and `projects.md`.
- Section pages: `articles.md`, `notes.md`, and `photos.md`.
- `src/data/projects.ts` and other personal data not assigned to individual
  texts, finds, or gallery content.
- Preserve `src/data/talks.ts` and `beb.md` in their current form.
  Removing or editing their contents is a separate task.

Include all existing locales of these permanent pages in this commit.
Their updated homepage references to `/og.jpg` belong here.
Exclude `finds.md`, `(content)`, and `(finds)` files, except for the technical
template already assigned to `Site`.

### Photos

Keep the gallery contents together in one commit:

- Images under `photos/`.
- `photos/catalog.ts`: the manual catalog; array order defines gallery order.
- `photos/generated.json`: the committed metadata cache.

`photos/model.ts`, `photos/data.ts`, and `photos/README.md` belong to `Site`.
All other current files under `photos/` belong to `Photos`. Do not move the
entire `public/` directory into this commit.

Preserve catalog order, captions, ratings, and IDs. Do not re-encode images or
regenerate the cache unnecessarily. Root-level `photos.json` and
`photos-custom.json` do not exist in the current source tree; do not include
them in transfer commands.

### Finds

Create one separate commit containing:

- `src/data/finds.ts`: the external finds list and its current types,
  including pending new entries.
- Finished `pages/en/(finds)/*.md` internal finds, when available. The current
  `nobel-prize.md` is unfinished and must not enter any new commit. Keep it
  locally in `drafts/nobel-prize.md`; the backup retains the original path.
- `pages/<locale>/finds.md`: section pages in all existing locales.

There is no manual Nobel Prize entry in `src/data/finds.ts`: it was discovered
automatically from Markdown. Excluding its route source removes it from finds,
search, RSS, and locale aliases. Do not add an external replacement entry.

Components, search, RSS, and routing support belong to `Site`.
Preserve entry order. Internal finds remain English sources only; do not
duplicate them in `src/data/finds.ts` or other locale directories.

### Texts and Their Images

One slug means one commit containing every existing translation from
`pages/<locale>/(content)/<slug>.md` and the text's own media.
Do not create separate translation commits or fill missing locales with
placeholder translations. Preserve the existing fallback behavior.

The current working tree assigns images as follows:

| Commit | Files |
| --- | --- |
| `Colophon` | `public/og/colophon-og.png`. |
| `Who is Teslak` | `public/images/avatars.avif`, the avatar evolution collage. |
| `Robophobia` | `public/og/robophobia-og.jpg`. |
| `No single language` | `public/images/multilang.avif` and `public/og/no-single-language-og.jpg`. |

The old `public/og/og-multilang.png` is being removed. Preserve the final
replacement rather than carrying both versions into the rebuilt history.

**OG images are being prepared by the user.** Some are already present;
additional images may follow before the source snapshot is finalized.
Keep each image and its frontmatter references in the corresponding text's
commit, without adding a separate OG commit. Use one shared image for all
translations of a text when appropriate, updating each existing locale.

Current cards are directly under `public/og/`, using the filenames above.
Preserve these agreed paths. For additional cards, follow the page content
rules; PNG and JPEG are supported, with dimensions of 1200 by 630.
The shared `public/og.jpg` remains the default image in `Site`.

The Colophon OG image is connected to all six existing translations before
the source snapshot is finalized. `Who is Teslak` and `Sample clip` currently
have no custom OG reference and use the default.

`public/avatar.avif` is the shared site avatar. The separate `avatars.avif`
collage is a text illustration. It also appears in `template.md` demos;
those demos receive the image after `Who is Teslak`. Earlier intermediate
snapshots are not required to be fully functional.

Any future audio versions or other media specific to a text belong in that
text's commit. There are currently no actual audio files in the source tree.
A file shared by several publications must have one owner in the manifest
and enter before the first text that needs it. Do not duplicate it across
commits. A future independent image collection could justify `Images`,
but no such collection currently exists.

Keep the agreed text commit order shown below, independently of publication
dates. The four Notes texts use October 20, 2026, one hour apart in every
existing translation: Colophon at 14:00 UTC, Who is Teslak at 15:00 UTC,
Robophobia at 16:00 UTC, and No single language at 17:00 UTC. Sample clip
retains its existing September 1 date and its agreed final commit position.
It remains a draft and does not count toward translation coverage.
Git commit dates are not publication dates.

| Subject | Slug | Existing locales |
| --- | --- | --- |
| `Colophon` | `colophon` | en, ru, de, es, fr, pt |
| `Who is Teslak` | `who-is-teslak` | en, ru, de, es, fr, pt |
| `Robophobia` | `robophobia` | en, ru, de, es, fr, pt |
| `No single language` | `no-single-language` | en, ru, de, es, fr, pt |
| `Sample clip` | `sample-clip` | en |

This produces **10 commits**: five shared layers and five texts.
New OG cards and external finds do not increase the count. Update the inventory
if texts are added or removed before execution. Do not automatically assign
new `(content)` files to `Pages`.

## Preparation

1. Create a complete independent copy at `/home/teslak/Sites/dg-bu`, including
   the old `.git`, pending changes, ignored local files, and all `AGENTS.md`
   files. Keep that directory permanently.
2. Finalize the intended OG images and frontmatter. Include this plan in the
   source snapshot. Capture all intended tracked changes and new source files
   in one `Snapshot` commit on `main-backup` inside `dg-bu`.
3. Record the snapshot commit/tree IDs, original remote `main` SHA, manifests,
   and execution results in backup metadata outside the published tree.
4. Create and verify a complete `git bundle` containing all old refs and the
   snapshot. Keep `main-backup` local only; do not publish it to GitHub.
5. Keep working in `/home/teslak/Sites/dg`. Prepare a separate clean Git object
   database; preserve the existing source files, local configuration, and
   dependencies when installing the new history there.
6. Build a complete manifest of tracked source paths. Assign every retained
   path to exactly one group. Exclude every file named `AGENTS.md` from the
   new tree and from all intermediate commits. Exclude the unfinished Nobel
   Prize find as well; preserve its local ignored draft.
7. Create an explicit upstream `Base` allowlist. Do not import personal
   upstream pages or media. Preserve file modes and symlink targets.

## Signed Hash Prefixes

Keep the existing signed `Base`. Require these SHA-1 prefixes:

| Subject | Prefix |
| --- | --- |
| `Site` | `0000000` |
| `Pages` | `1111111` |
| `Finds` | `2222222` |
| `Photos` | `fffffff` |

Finalize each tree and parent before signing with the configured SSH key.
Search the final signed object by varying only valid base64 line wrapping
inside the SSH signature armor. Preserve the decoded signature, signed
payload, short subject, author, dates, and file contents. Verify each winner
locally before using it as the next parent. Sign the remaining text commits
normally. Confirm GitHub verification after publication.

Seven fixed hex digits require 268,435,456 attempts on average for each
prefix; runtime is not guaranteed. Changing an earlier commit changes its
descendants and requires new searches for their prefixes. No tag is required.

## Building the New History

1. Create a separate temporary repository with `git init` and `main` as its
   primary branch. Leave the original working copy available.
2. Export files from pinned snapshots, for example with `git archive` and an
   explicit path list. Do not make old `main` a parent, fetch old refs, or
   fetch upstream history into the new publication repository.
3. Prepare and inspect the cleaned base before staging it, then create the
   root `Base` commit. Unwanted binaries must never enter this commit.
4. Create `Site`, `Pages`, `Finds`, `Photos`, and individual text commits in
   order. Stage only the current group's paths. Avoid unconditional
   `git add -A` while files for later groups are present.
5. Handle deletions as well as additions and replacements. After `Site`,
   remove base files absent from the source unless a later step explicitly
   requires them.
6. Compare each commit's changes against its group manifest. Text commits
   must not modify implementation code, shared lists, the gallery catalog,
   or translations of unrelated texts.

Intermediate `Base`, `Site`, `Pages`, `Finds`, and `Photos` commits are editing
boundaries; independent builds are not required by this plan.
For example, `photos/data.ts` imports the catalog from the later `Photos`
commit, and finds code imports data from `Finds`. Do not invent temporary
stubs for these intervals. Validate the complete final tree.
Requiring every commit to build independently would need a separate change
to this dependency arrangement.

## Validation

1. Derive the expected tree from the pinned source by removing all
   `AGENTS.md` paths and the deferred Nobel Prize Markdown file. Compare that
   tree ID with the final commit's tree ID.
   They must match, covering paths, contents, modes, and symlink targets.
   Diagnose differences with `git diff --exit-code` in a separate verification
   repository where both commits are available. Do not import old refs into
   the clean publication repository.
2. Verify a linear history with one root without parents, the expected
   10 commits, no merge commits, and no old antfu/DG ancestor chain.
3. Confirm the four agreed hash prefixes and valid SSH signatures. No new
   commit may contain an `AGENTS.md` file or the deferred Nobel Prize find.
   Check every commit
   against its manifest. Identical final trees do not
   exclude unwanted files in intermediate commits.
4. Install dependencies with `pnpm install --frozen-lockfile`.
5. Run:

   ```bash
   pnpm check:photos
   pnpm lint:md
   pnpm check:i18n
   pnpm lint
   pnpm typecheck
   pnpm test:photos
   pnpm build
   ```

   The build repeats some checks and additionally validates SEO.
   Resolve frontmatter warnings before publication. If a fix changes the
   source site, make it in the source first and rebuild history from the
   updated snapshot.
6. Inspect generated pages and media: home, unknown-URL 404 behavior,
   localized routes and article fallback, finds, gallery, RSS, and search.
   Locale switching must preserve query and hash. Do not add an SPA
   catch-all rewrite.
7. Confirm that validation has not modified tracked files.
8. Create a fresh clone containing only the new `main` and measure `.git`.
   Use `--no-local` for a local clone to avoid inheriting extra objects.
   The target is under 70 MB; record the actual measured result.

## Publication and Recovery

1. Keep `main-backup` only in the local `dg-bu` repository. Do not publish
   the backup branch or any old refs. Leave unrelated remote branches/tags
   unchanged; they may keep portions of old history reachable on the server.
2. Check remote `main` against its recorded original SHA before replacement.
   If it has advanced, stop and incorporate those changes before publishing.
   The newer backup `Snapshot` commit is not the expected remote `main` SHA.
3. Publish only the verified `main` with an explicit expected SHA:
   `--force-with-lease=refs/heads/main:<expected-remote-sha>`.
   Do not use `push --mirror` or publish all old branches.
4. Clone only the published `main` with `--single-branch --branch main`,
   verify its final tree ID, and check the site
   after the Netlify build. A force-push alone does not guarantee immediate
   storage reclamation by the host.
5. Keep `dg-bu`, its bundle, and local `main-backup` permanently. Continue
   ongoing work in `dg` with its clean Git history. Do not expire reflogs or
   run `gc --prune=now --aggressive` in the backup.
6. To roll back, restore the old commit from the retained repository or
   bundle. Restoring remote `main` also requires an explicit lease against
   the actual published SHA so later work is not overwritten.

After the rewrite, direct edits into the intended commit using
`git commit --fixup=<sha>` and `git rebase --root -i --autosquash`.
Rewriting published history changes SHAs and requires publication with a lease.
The external backup remains independent of subsequent history edits.
