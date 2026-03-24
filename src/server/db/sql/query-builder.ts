import { Knex } from "knex";
import { getKnex } from "./knex";

export type QueryResult<T> = {
  query: Knex.QueryBuilder;
  toPageResult: (rows: T[]) => PageResult<T>;
};

export const decodeCursor = (cursor: string): Record<string, FilterLiteral> => {
  return JSON.parse(Buffer.from(cursor, "base64url").toString("utf8"));
};

export const encodeCursor = <T>(row: T, sortFields: string[]): string => {
  const values: Record<string, unknown> = {};
  for (const field of sortFields) {
    values[field] = (row as Record<string, unknown>)[field];
  }
  return Buffer.from(JSON.stringify(values), "utf8").toString("base64url");
};

export const buildQuery = <T extends Entity>(
  table: string,
  findOptions?: FindOptions,
  queryFn?: (query: Knex.QueryBuilder) => void
): QueryResult<T> => {
  const knex = getKnex();
  const query: Knex.QueryBuilder = knex(table);

  if (queryFn) {
    queryFn(query);
  }

  const applyCriteria = (query: Knex.QueryBuilder, criteria: Criteria) => {
    if ((criteria as AndCriteria).$and) {
      (criteria as AndCriteria).$and.forEach((subCriteria: Criteria) => {
        query.andWhere((subQuery: any) => applyCriteria(subQuery, subCriteria));
      });
    } else if ((criteria as OrCriteria).$or) {
      (criteria as OrCriteria).$or.forEach((subCriteria: Criteria) => {
        query.orWhere((subQuery: any) => applyCriteria(subQuery, subCriteria));
      });
    } else if ((criteria as NotCriteria).$not) {
      query.whereNot((subQuery: any) => applyCriteria(subQuery, (criteria as NotCriteria).$not));
    } else {
      Object.keys(criteria).forEach((property) => {
        const value = (criteria as FilterCriteria)[property];
        if (typeof value === "object" && value !== null) {
          Object.entries(value).forEach(([operator, operatorValue]) => {
            switch (operator) {
              case "$eq":
                query.where(property, operatorValue);
                break;
              case "$gt":
                query.where(property, ">", operatorValue);
                break;
              case "$gte":
                query.where(property, ">=", operatorValue);
                break;
              case "$lt":
                query.where(property, "<", operatorValue);
                break;
              case "$lte":
                query.where(property, "<=", operatorValue);
                break;
              case "$ne":
                query.where(property, "!=", operatorValue);
                break;
              case "$in":
                query.whereIn(property, operatorValue as FilterValue[]);
                break;
              case "$nin":
                query.whereNotIn(property, operatorValue as FilterValue[]);
                break;
              case "$like":
                query.where(property, "like", operatorValue);
                break;
              default:
                throw new Error(`Unknown operator: ${operator}`);
            }
          });
        } else {
          query.where(property, value);
        }
      });
    }
  };

  if (findOptions?.criteria != null) {
    applyCriteria(query, findOptions.criteria);
  }

  // Build sort fields — always include "id" as tiebreaker for deterministic ordering
  const sortFields: string[] = [];
  const sortDirections: ("asc" | "desc")[] = [];

  if (findOptions?.sort != null) {
    findOptions.sort.forEach((sort) => {
      sortFields.push(sort.property);
      sortDirections.push(sort.direction);
      query.orderBy(sort.property, sort.direction);
    });
  }

  if (!sortFields.includes("id")) {
    sortFields.push("id");
    sortDirections.push("asc");
    query.orderBy("id", "asc");
  }

  // Apply cursor-based keyset pagination
  if (findOptions?.cursor != null) {
    const cursorValues = decodeCursor(findOptions.cursor);

    query.andWhere((sub: any) => {
      // For keyset pagination with multiple sort fields, build a row-value comparison.
      // For (a, b) > (va, vb): (a > va) OR (a = va AND b > vb)
      for (let i = 0; i < sortFields.length; i++) {
        const field = sortFields[i];
        const direction = sortDirections[i];
        const op = direction === "desc" ? "<" : ">";

        sub.orWhere((inner: any) => {
          for (let j = 0; j < i; j++) {
            inner.andWhere(sortFields[j], cursorValues[sortFields[j]]);
          }
          inner.andWhere(field, op, cursorValues[field]);
        });
      }
    });
  }

  // Fetch limit + 1 to detect next page
  const limit = findOptions?.limit;
  if (limit != null) {
    query.limit(limit + 1);
  }

  const toPageResult = (rows: T[]): PageResult<T> => {
    if (limit != null && rows.length > limit) {
      const items = rows.slice(0, limit);
      const lastItem = items[items.length - 1];
      return {
        items,
        nextCursor: encodeCursor(lastItem, sortFields),
      };
    }
    return { items: rows };
  };

  return { query, toPageResult };
};
