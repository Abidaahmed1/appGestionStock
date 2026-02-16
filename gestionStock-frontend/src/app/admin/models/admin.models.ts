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
}

export interface RoleRepresentation {
    id: string;
    name: string;
    description?: string;
}
