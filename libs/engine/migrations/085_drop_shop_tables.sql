-- Migration 085: Drop unused shop e-commerce tables
-- Phase 1A of database consolidation (docs/plans/planned/database-consolidation-architecture.md)
-- These tables were part of the deferred shop feature (Phase 5+) and contain no production data.
-- FK-safe order: children before parents.

DROP TABLE IF EXISTS discount_codes;
DROP TABLE IF EXISTS refunds;
DROP TABLE IF EXISTS connect_accounts;
DROP TABLE IF EXISTS order_line_items;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS subscriptions;
DROP TABLE IF EXISTS customers;
DROP TABLE IF EXISTS product_variants;
DROP TABLE IF EXISTS products;
