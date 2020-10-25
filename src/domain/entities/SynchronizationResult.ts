export type SynchronizationStatus = "PENDING" | "SUCCESS" | "WARNING" | "ERROR" | "NETWORK ERROR";

export type SynchronizationResults = SynchronizationResult[];

export interface SynchronizationStats {
    type?: string;
    imported: number;
    updated: number;
    ignored: number;
    deleted: number;
    total?: number;
}

export interface ErrorMessage {
    id: string;
    message: string;
}

export interface SynchronizationResult {
    status: SynchronizationStatus;
    message?: string;
    stats?: SynchronizationStats[];
    errors?: ErrorMessage[];
    rawResponse: object;
}
