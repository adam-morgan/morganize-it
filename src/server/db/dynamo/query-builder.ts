import { QueryCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { DynamoTableSchema } from "./tables";

type ExpressionContext = {
  expressions: string[];
  names: Record<string, string>;
  values: Record<string, unknown>;
  counter: number;
};

const nextPlaceholder = (ctx: ExpressionContext, prefix = "v"): string => {
  ctx.counter++;
  return `:${prefix}${ctx.counter}`;
};

const nameRef = (ctx: ExpressionContext, property: string): string => {
  const ref = `#${property.replace(/[^a-zA-Z0-9]/g, "_")}`;
  ctx.names[ref] = property;
  return ref;
};

const buildFilterExpression = (ctx: ExpressionContext, criteria: Criteria): string => {
  if ("$and" in criteria) {
    const parts = (criteria as AndCriteria).$and.map((sub) => buildFilterExpression(ctx, sub));
    return `(${parts.join(" AND ")})`;
  }

  if ("$or" in criteria) {
    const parts = (criteria as OrCriteria).$or.map((sub) => buildFilterExpression(ctx, sub));
    return `(${parts.join(" OR ")})`;
  }

  if ("$not" in criteria) {
    const inner = buildFilterExpression(ctx, (criteria as NotCriteria).$not);
    return `NOT ${inner}`;
  }

  const filterCriteria = criteria as FilterCriteria;
  const parts: string[] = [];

  for (const property of Object.keys(filterCriteria)) {
    const value = filterCriteria[property];
    const nameKey = nameRef(ctx, property);

    if (value === null) {
      const placeholder = nextPlaceholder(ctx);
      ctx.values[placeholder] = "NULL";
      parts.push(`(attribute_not_exists(${nameKey}) OR attribute_type(${nameKey}, ${placeholder}))`);
    } else if (typeof value !== "object") {
      // Simple equality
      const placeholder = nextPlaceholder(ctx);
      ctx.values[placeholder] = value;
      parts.push(`${nameKey} = ${placeholder}`);
    } else {
      // Operator-based filter
      const ops = value as FilterOperator;
      for (const [operator, operatorValue] of Object.entries(ops)) {
        const placeholder = nextPlaceholder(ctx);

        switch (operator) {
          case "$eq":
            ctx.values[placeholder] = operatorValue;
            parts.push(`${nameKey} = ${placeholder}`);
            break;
          case "$gt":
            ctx.values[placeholder] = operatorValue;
            parts.push(`${nameKey} > ${placeholder}`);
            break;
          case "$gte":
            ctx.values[placeholder] = operatorValue;
            parts.push(`${nameKey} >= ${placeholder}`);
            break;
          case "$lt":
            ctx.values[placeholder] = operatorValue;
            parts.push(`${nameKey} < ${placeholder}`);
            break;
          case "$lte":
            ctx.values[placeholder] = operatorValue;
            parts.push(`${nameKey} <= ${placeholder}`);
            break;
          case "$ne":
            ctx.values[placeholder] = operatorValue;
            parts.push(`${nameKey} <> ${placeholder}`);
            break;
          case "$in": {
            const arr = operatorValue as FilterLiteral[];
            const placeholders = arr.map((_, i) => {
              const p = nextPlaceholder(ctx, `in${ctx.counter}_`);
              ctx.values[p] = arr[i];
              return p;
            });
            parts.push(`${nameKey} IN (${placeholders.join(", ")})`);
            break;
          }
          case "$nin": {
            const arr = operatorValue as FilterLiteral[];
            const placeholders = arr.map((_, i) => {
              const p = nextPlaceholder(ctx, `nin${ctx.counter}_`);
              ctx.values[p] = arr[i];
              return p;
            });
            parts.push(`NOT ${nameKey} IN (${placeholders.join(", ")})`);
            break;
          }
          case "$like": {
            // DynamoDB doesn't support LIKE. Use contains() as an approximation.
            // This handles "%value%" patterns. For "value%" use begins_with.
            const likeValue = operatorValue as string;
            if (likeValue.startsWith("%") && likeValue.endsWith("%")) {
              ctx.values[placeholder] = likeValue.slice(1, -1);
              parts.push(`contains(${nameKey}, ${placeholder})`);
            } else if (likeValue.endsWith("%")) {
              ctx.values[placeholder] = likeValue.slice(0, -1);
              parts.push(`begins_with(${nameKey}, ${placeholder})`);
            } else if (likeValue.startsWith("%")) {
              ctx.values[placeholder] = likeValue.slice(1);
              parts.push(`contains(${nameKey}, ${placeholder})`);
            } else {
              ctx.values[placeholder] = likeValue;
              parts.push(`${nameKey} = ${placeholder}`);
            }
            break;
          }
          default:
            throw new Error(`Unknown operator: ${operator}`);
        }
      }
    }
  }

  return parts.length === 1 ? parts[0] : `(${parts.join(" AND ")})`;
};

type IndexMatch = {
  indexName?: string; // undefined = primary key
  partitionKey: string;
  partitionValue: unknown;
  sortKey?: string;
};

const isCompound = (criteria: Criteria): boolean =>
  "$and" in criteria || "$or" in criteria || "$not" in criteria;

const flattenAnd = (criteria?: Criteria): Criteria | undefined => {
  if (!criteria || !("$and" in criteria)) return criteria;

  const merged: FilterCriteria = {};

  for (const part of (criteria as AndCriteria).$and as Criteria[]) {
    const flat = flattenAnd(part);

    if (!flat || isCompound(flat)) return criteria;

    for (const key of Object.keys(flat)) {
      if (key in merged) return criteria;

      merged[key] = (flat as FilterCriteria)[key];
    }
  }

  return merged;
};

const SORT_KEY_OPERATORS: Record<string, string> = {
  $eq: "=",
  $lt: "<",
  $lte: "<=",
  $gt: ">",
  $gte: ">=",
};

const canUseSortKey = (criteria: FilterCriteria, sortKey?: string): boolean => {
  if (!sortKey || criteria[sortKey] === undefined) return true;

  const value = criteria[sortKey];

  if (value === null) return false;

  if (typeof value !== "object") return true;

  const operators = Object.keys(value);

  return operators.length === 1 && operators[0] in SORT_KEY_OPERATORS;
};

/**
 * Find the best matching index for the given criteria.
 * Returns undefined if no index partition key matches an equality filter.
 */
const findBestIndex = (
  schema: DynamoTableSchema,
  criteria?: Criteria
): IndexMatch | undefined => {
  if (!criteria || isCompound(criteria)) return undefined;

  const fc = criteria as FilterCriteria;
  const equalityFilters: Record<string, unknown> = {};

  for (const key of Object.keys(fc)) {
    const val = fc[key];

    if (val !== null && typeof val !== "object") {
      equalityFilters[key] = val;
    } else if (val !== null && "$eq" in (val as FilterOperator)) {
      equalityFilters[key] = (val as FilterOperator).$eq;
    }
  }

  if (
    equalityFilters[schema.primaryKey.partition] != null &&
    canUseSortKey(fc, schema.primaryKey.sort)
  ) {
    return {
      partitionKey: schema.primaryKey.partition,
      partitionValue: equalityFilters[schema.primaryKey.partition],
      sortKey: schema.primaryKey.sort,
    };
  }

  // Check GSIs
  if (schema.indexes) {
    for (const [indexName, index] of Object.entries(schema.indexes)) {
      if (equalityFilters[index.partition] != null && canUseSortKey(fc, index.sort)) {
        return {
          indexName,
          partitionKey: index.partition,
          partitionValue: equalityFilters[index.partition],
          sortKey: index.sort,
        };
      }
    }
  }

  return undefined;
};

export type DynamoQueryInput = {
  command: QueryCommand | ScanCommand;
  /** Sort fields to apply client-side when DynamoDB can't sort natively */
  clientSideSort?: Sort[];
  limit?: number;
};

export const buildDynamoQuery = (
  tableName: string,
  schema: DynamoTableSchema,
  findOptions?: FindOptions
): DynamoQueryInput => {
  const ctx: ExpressionContext = {
    expressions: [],
    names: {},
    values: {},
    counter: 0,
  };

  const criteria = flattenAnd(findOptions?.criteria);
  const indexMatch = findBestIndex(schema, criteria);
  const limit = findOptions?.limit;

  if (indexMatch) {
    // Use QueryCommand — more efficient
    const partitionRef = nameRef(ctx, indexMatch.partitionKey);
    const partitionPlaceholder = nextPlaceholder(ctx);
    ctx.values[partitionPlaceholder] = indexMatch.partitionValue;
    let keyCondition = `${partitionRef} = ${partitionPlaceholder}`;

    // If the criteria includes the sort key with an equality / range operator,
    // it MUST go in the KeyConditionExpression — DynamoDB rejects key
    // attributes appearing in a FilterExpression. Pull it out before building
    // the filter expression for non-key attributes.
    let filterExpression: string | undefined;
    if (criteria) {
      const remainingCriteria = { ...criteria } as FilterCriteria;
      delete remainingCriteria[indexMatch.partitionKey];

      if (indexMatch.sortKey && remainingCriteria[indexMatch.sortKey] !== undefined) {
        const sortValue = remainingCriteria[indexMatch.sortKey];
        const sortRef = nameRef(ctx, indexMatch.sortKey);
        const sortPlaceholder = nextPlaceholder(ctx);

        if (typeof sortValue !== "object") {
          ctx.values[sortPlaceholder] = sortValue;
          keyCondition += ` AND ${sortRef} = ${sortPlaceholder}`;
        } else {
          const [op, val] = Object.entries(sortValue as FilterOperator)[0];
          ctx.values[sortPlaceholder] = val;
          keyCondition += ` AND ${sortRef} ${SORT_KEY_OPERATORS[op]} ${sortPlaceholder}`;
        }
        delete remainingCriteria[indexMatch.sortKey];
      }

      if (Object.keys(remainingCriteria).length > 0) {
        filterExpression = buildFilterExpression(ctx, remainingCriteria);
      }
    }

    // Determine sort direction using the index's sort key
    let scanIndexForward = true;
    let clientSideSort: Sort[] | undefined;

    if (findOptions?.sort) {
      if (indexMatch.sortKey) {
        const sortOnSortKey = findOptions.sort.find((s) => s.property === indexMatch.sortKey);
        if (sortOnSortKey) {
          scanIndexForward = sortOnSortKey.direction === "asc";
          // If there are additional sort fields beyond the sort key, those need client-side sort
          if (findOptions.sort.length > 1) {
            clientSideSort = findOptions.sort;
          }
        } else {
          clientSideSort = findOptions.sort;
        }
      } else {
        clientSideSort = findOptions.sort;
      }
    }

    // Handle cursor (ExclusiveStartKey)
    let exclusiveStartKey: Record<string, unknown> | undefined;
    if (findOptions?.cursor) {
      exclusiveStartKey = JSON.parse(
        Buffer.from(findOptions.cursor, "base64url").toString("utf8")
      );
    }

    const command = new QueryCommand({
      TableName: tableName,
      ...(indexMatch.indexName && { IndexName: indexMatch.indexName }),
      KeyConditionExpression: keyCondition,
      ...(filterExpression && { FilterExpression: filterExpression }),
      ...(Object.keys(ctx.names).length > 0 && { ExpressionAttributeNames: ctx.names }),
      ...(Object.keys(ctx.values).length > 0 && { ExpressionAttributeValues: ctx.values }),
      ScanIndexForward: scanIndexForward,
      ...(limit && { Limit: limit }),
      ...(exclusiveStartKey && { ExclusiveStartKey: exclusiveStartKey }),
    });

    return { command, clientSideSort, limit };
  } else {
    // Fall back to ScanCommand
    let filterExpression: string | undefined;
    if (criteria) {
      filterExpression = buildFilterExpression(ctx, criteria);
    }

    let exclusiveStartKey: Record<string, unknown> | undefined;
    if (findOptions?.cursor) {
      exclusiveStartKey = JSON.parse(
        Buffer.from(findOptions.cursor, "base64url").toString("utf8")
      );
    }

    const command = new ScanCommand({
      TableName: tableName,
      ...(filterExpression && { FilterExpression: filterExpression }),
      ...(Object.keys(ctx.names).length > 0 && { ExpressionAttributeNames: ctx.names }),
      ...(Object.keys(ctx.values).length > 0 && { ExpressionAttributeValues: ctx.values }),
      ...(limit && { Limit: limit }),
      ...(exclusiveStartKey && { ExclusiveStartKey: exclusiveStartKey }),
    });

    return { command, clientSideSort: findOptions?.sort, limit };
  }
};

export const encodeDynamoCursor = (lastEvaluatedKey: Record<string, unknown>): string => {
  return Buffer.from(JSON.stringify(lastEvaluatedKey), "utf8").toString("base64url");
};
