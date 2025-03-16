type FindOptions = {
  criteria?: Criteria;
  sort?: Sort[];
  limit?: number;
  offset?: number;
};

type Criteria = AndCriteria | OrCriteria | NotCriteria | FilterCriteria;

type AndCriteria = {
  $and: QueryCriteria[];
};

type OrCriteria = {
  $or: QueryCriteria[];
};

type NotCriteria = {
  $not: QueryCriteria;
};

type FilterCriteria = {
  [property: string]: FilterValue;
};

type FilterValue = FilterLiteral | FilterOperator;

type FilterLiteral = null | string | number | boolean;

type FilterOperator = {
  $eq?: FilterLiteral;
  $gt?: FilterLiteral;
  $gte?: FilterLiteral;
  $lt?: FilterLiteral;
  $lte?: FilterLiteral;
  $ne?: FilterLiteral;
  $in?: FilterLiteral[];
  $nin?: FilterLiteral[];
  $regex?: string;
};

type Sort = {
  property: string;
  direction: "asc" | "desc";
};
