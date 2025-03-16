import { Knex } from "knex";
import { getKnex } from "./knex";

export const buildQuery = (table: string, findOptions?: FindOptions) => {
  const knex = getKnex();
  const query: Knex.QueryBuilder = knex(table);

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
              case "$regex":
                // TODO: Implement regex
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

  if (findOptions?.sort != null) {
    findOptions?.sort.forEach((sort) => {
      query.orderBy(sort.property, sort.direction);
    });
  }

  if (findOptions?.offset != null) {
    query.offset(findOptions.offset);
  }

  if (findOptions?.limit != null) {
    query.limit(findOptions.limit);
  }

  return query;
};
