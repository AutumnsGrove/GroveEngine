/**
 * Shelves CRUD - Validation Schemas
 *
 * Zod schemas for shelf and item form actions.
 */

import { z } from "zod";

export const AddShelfSchema = z.object({
	name: z.string().optional().default(""),
	description: z.string().optional().default(""),
	preset: z.string().optional().default("custom"),
	displayMode: z.string().optional().default(""),
	material: z.string().optional().default(""),
});

export const AddItemSchema = z.object({
	shelfId: z.string().min(1),
	url: z.string().optional().default(""),
	title: z.string().optional().default(""),
	creator: z.string().optional().default(""),
	description: z.string().optional().default(""),
	category: z.string().optional().default(""),
	coverUrl: z.string().optional().default(""),
	thumbnailUrl: z.string().optional().default(""),
	isStatus1: z.string().optional(),
	isStatus2: z.string().optional(),
	rating: z.string().optional().default(""),
	note: z.string().optional().default(""),
});

export const UpdateShelfSchema = z.object({
	shelfId: z.string().min(1),
	name: z.string().optional().default(""),
	description: z.string().nullable().optional(),
	displayMode: z.string().optional().default(""),
	material: z.string().optional().default(""),
	creatorLabel: z.string().optional().default(""),
	status1Label: z.string().optional().default(""),
	status2Label: z.string().optional().default(""),
});

export const UpdateItemSchema = z.object({
	itemId: z.string().min(1),
	title: z.string().optional().default(""),
	url: z.string().optional().default(""),
	creator: z.string().nullable().optional(),
	description: z.string().nullable().optional(),
	category: z.string().nullable().optional(),
	rating: z.string().nullable().optional(),
	note: z.string().nullable().optional(),
});

export const ShelfIdSchema = z.object({
	shelfId: z.string().min(1),
});

export const ItemIdSchema = z.object({
	itemId: z.string().min(1),
});
