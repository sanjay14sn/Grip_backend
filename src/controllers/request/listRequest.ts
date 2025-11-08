import { z } from 'zod';

// Define the schema for query parameters
export const listRequestSchema = z.object({
    search: z.string().optional(), // Optional string
    page: z.number().optional(),
    limit: z.number()
});

// Infer the TypeScript type
export type listRequest = z.infer<typeof listRequestSchema>;
