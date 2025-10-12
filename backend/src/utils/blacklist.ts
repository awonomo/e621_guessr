/**
 * Shared blacklist filtering utilities
 * Used by both backend (daily challenges) and frontend (user filtering)
 */

export interface BlacklistFilter {
  checkPost(post: any, blacklistedTags: string[]): boolean;
  checkTags(tags: string[], blacklistedTags: string[]): boolean;
}

/**
 * Check if a post passes blacklist filtering
 * @param post E621 post object with tags property
 * @param blacklistedTags Array of tags to filter out
 * @returns true if post is allowed, false if it should be filtered
 */
export function checkPostAgainstBlacklist(post: any, blacklistedTags: string[]): boolean {
  const allTags = Object.values(post.tags).flat() as string[];
  return checkTagsAgainstBlacklist(allTags, blacklistedTags);
}

/**
 * Check if a tag array passes blacklist filtering
 * @param tags Array of tags to check
 * @param blacklistedTags Array of tags to filter out
 * @returns true if tags are allowed, false if any match blacklist
 */
export function checkTagsAgainstBlacklist(tags: string[], blacklistedTags: string[]): boolean {
  for (const blacklistedTag of blacklistedTags) {
    if (tags.includes(blacklistedTag)) {
      return false;
    }
  }
  return true;
}