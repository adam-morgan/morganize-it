import {
  DeleteCommand,
  PutCommand,
  QueryCommand,
  QueryCommandOutput,
  ScanCommand,
  ScanCommandOutput,
} from "@aws-sdk/lib-dynamodb";
import { from, Observable } from "rxjs";
import { AbstractReactiveService, TableID } from "../reactive-service";
import { NotFoundError } from "@/server/errors";
import { getDocClient } from "./client";
import { buildDynamoQuery, encodeDynamoCursor } from "./query-builder";
import { DynamoTableSchema } from "./tables";

const withoutNulls = <T>(data: T): T =>
  Object.fromEntries(
    Object.entries(data as Record<string, unknown>).filter(([, value]) => value !== null)
  ) as T;

export class ReactiveDynamoService<T extends Entity> extends AbstractReactiveService<T> {
  constructor(
    protected tableName: string,
    protected schema: DynamoTableSchema,
    protected override idProperty: string = "id"
  ) {
    super();
  }

  find(options?: FindOptions): Observable<PageResult<T>> {
    const { command, clientSideSort, limit } = buildDynamoQuery(
      this.tableName,
      this.schema,
      options
    );

    return from(
      this.send(command, limit == null).then((result) => {
        let items = (result.Items ?? []) as T[];

        // Apply client-side sort if DynamoDB couldn't sort natively
        if (clientSideSort && clientSideSort.length > 0) {
          items = this.sortItems(items, clientSideSort);
        }

        // Apply limit if client-side sorting changed the order
        if (clientSideSort && limit && items.length > limit) {
          items = items.slice(0, limit);
        }

        const pageResult: PageResult<T> = { items };

        if (result.LastEvaluatedKey) {
          pageResult.nextCursor = encodeDynamoCursor(result.LastEvaluatedKey);
        }

        return pageResult;
      })
    );
  }

  private async send(
    command: QueryCommand | ScanCommand,
    allPages: boolean
  ): Promise<QueryCommandOutput | ScanCommandOutput> {
    const client = getDocClient();
    const first = await client.send(command as QueryCommand);

    if (!allPages) return first;

    const items = [...(first.Items ?? [])];
    let lastKey = first.LastEvaluatedKey;

    while (lastKey) {
      command.input.ExclusiveStartKey = lastKey;

      const page = await client.send(command as QueryCommand);

      items.push(...(page.Items ?? []));
      lastKey = page.LastEvaluatedKey;
    }

    return { ...first, Items: items, LastEvaluatedKey: undefined };
  }

  create(data: T): Observable<T> {
    const item = withoutNulls(data);

    const command = new PutCommand({
      TableName: this.tableName,
      Item: item as Record<string, unknown>,
      ConditionExpression: `attribute_not_exists(${this.idProperty})`,
    });

    return from(
      getDocClient()
        .send(command)
        .then(() => item)
        .catch((err) => {
          if (err.name === "ConditionalCheckFailedException") {
            throw new Error(`Item with ${this.idProperty} "${(item as Record<string, unknown>)[this.idProperty]}" already exists`);
          }
          throw err;
        })
    );
  }

  update(id: TableID, data: T): Observable<T> {
    const item = withoutNulls(data);

    const command = new PutCommand({
      TableName: this.tableName,
      Item: { ...item, [this.idProperty]: id } as Record<string, unknown>,
      ConditionExpression: `attribute_exists(${this.idProperty})`,
    });

    return from(
      getDocClient()
        .send(command)
        .then(() => ({ ...item, [this.idProperty]: id }))
        .catch((err) => {
          if (err.name === "ConditionalCheckFailedException") {
            throw new NotFoundError("Record not found");
          }
          throw err;
        })
    );
  }

  delete(id: TableID): Observable<void> {
    const command = new DeleteCommand({
      TableName: this.tableName,
      Key: this.buildKey(id),
      ConditionExpression: `attribute_exists(${this.idProperty})`,
    });

    return from(
      getDocClient()
        .send(command)
        .then(() => undefined)
        .catch((err) => {
          if (err.name === "ConditionalCheckFailedException") {
            throw new NotFoundError("Record not found");
          }
          throw err;
        })
    );
  }

  protected buildKey(id: TableID): Record<string, unknown> {
    return { [this.idProperty]: id };
  }

  private sortItems(items: T[], sort: Sort[]): T[] {
    return [...items].sort((a, b) => {
      for (const s of sort) {
        const aVal = (a as Record<string, unknown>)[s.property];
        const bVal = (b as Record<string, unknown>)[s.property];
        if (aVal === bVal) continue;
        const cmp = aVal! < bVal! ? -1 : 1;
        return s.direction === "desc" ? -cmp : cmp;
      }
      return 0;
    });
  }
}
