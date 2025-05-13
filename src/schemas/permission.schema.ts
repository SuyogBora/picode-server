import z from "zod";

  export const queryPermissionSchema = z.object({
    query: z.object({
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(10),
        search: z.string().optional(),
        name: z.array(z.string()).optional(),
        resource: z.array(z.string()).optional(),
        sort: z.string().optional()
    })
  });
  

  export type PermissionsQueryParams = z.infer<typeof queryPermissionSchema>['query'];
  