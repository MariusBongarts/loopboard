import matter from "gray-matter";

// gray-matter caches a file *before* parsing it unless options are passed,
// so a YAML error would leave an empty cached entry that later reads return
// as a ghost issue (#0042). Always pass options to bypass the cache.
export function parseFrontmatter(raw: string): matter.GrayMatterFile<string> {
  return matter(raw, {});
}
