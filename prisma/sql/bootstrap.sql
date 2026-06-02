-- One-time bootstrap for the isolated AI schema.
-- Creates the dedicated schema and enables pgvector inside it so the
-- `vector` type resolves when the connection's search_path is `equity`.
CREATE SCHEMA IF NOT EXISTS equity;
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA equity;
