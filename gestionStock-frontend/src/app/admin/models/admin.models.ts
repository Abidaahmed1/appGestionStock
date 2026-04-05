export interface UserRepresentation {
    id?: string;
    username?: string;
    email?: string;
    firstName?: string;
    lastName?: string;
    enabled?: boolean;
    emailVerified?: boolean;
    attributes?: { [key: string]: string[] };
    role?: string;
    createdTimestamp?: number;
}

export interface RoleRepresentation {
    id: string;
    name: string;
    description?: string;
}
