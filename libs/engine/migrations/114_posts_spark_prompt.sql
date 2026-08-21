-- 114_posts_spark_prompt.sql
-- Writing Prompts curio (issue #1575) — Spark button in Flow
-- Records which prompt (if any) a draft started from, for the
-- "Started with a spark" attribution shown on the post.
--
-- Nullable TEXT: stores the prompt's text verbatim rather than an index
-- into the prompt bank, since that bank grows and reorders over time.

ALTER TABLE posts ADD COLUMN spark_prompt TEXT;
