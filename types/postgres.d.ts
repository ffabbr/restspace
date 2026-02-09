declare module "postgres" {
  type PostgresOptions = Record<string, unknown>;
  type Sql = (<T = unknown>(strings: TemplateStringsArray, ...values: unknown[]) => Promise<T[]>) & {
    end: (options?: { timeout?: number }) => Promise<void>;
  };

  export default function postgres(url: string, options?: PostgresOptions): Sql;
}
