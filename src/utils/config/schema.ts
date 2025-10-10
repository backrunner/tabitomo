/**
 * Schema Definition System
 * Similar to Drizzle/Prisma but lightweight for config validation and migration
 */

// Field types for schema definition
export type FieldType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'object'
  | 'array'
  | 'enum';

export interface FieldSchema<T = unknown> {
  type: FieldType;
  optional?: boolean;
  default?: T;
  enum?: readonly string[];
  properties?: Record<string, FieldSchema>; // For nested objects
  itemType?: FieldSchema; // For arrays
  validate?: (value: unknown) => boolean;  // Accept unknown for flexibility
  description?: string;
}

export interface ObjectSchema {
  [key: string]: FieldSchema;
}

/**
 * Schema builder - provides a fluent API for defining schemas
 */
export const schema = {
  string: (opts?: { optional?: boolean; default?: string; enum?: readonly string[] }): FieldSchema<string> => ({
    type: 'string',
    optional: opts?.optional,
    default: opts?.default,
    enum: opts?.enum,
  }),

  number: (opts?: { optional?: boolean; default?: number; validate?: (v: unknown) => boolean }): FieldSchema<number> => ({
    type: 'number',
    optional: opts?.optional,
    default: opts?.default,
    validate: opts?.validate,
  }),

  boolean: (opts?: { optional?: boolean; default?: boolean }): FieldSchema<boolean> => ({
    type: 'boolean',
    optional: opts?.optional,
    default: opts?.default,
  }),

  enum: <T extends string>(values: readonly T[], opts?: { optional?: boolean; default?: T }): FieldSchema<T> => ({
    type: 'enum',
    optional: opts?.optional,
    default: opts?.default,
    enum: values as readonly string[],
  }),

  object: <T extends ObjectSchema>(properties: T, opts?: { optional?: boolean }): FieldSchema<Record<string, unknown>> => ({
    type: 'object',
    optional: opts?.optional,
    properties,
  }),

  array: <T>(itemType: FieldSchema<T>, opts?: { optional?: boolean; default?: T[] }): FieldSchema<T[]> => ({
    type: 'array',
    optional: opts?.optional,
    default: opts?.default,
    itemType,
  }),
};

type ValidatedValue = string | number | boolean | Record<string, unknown> | unknown[] | undefined;

interface ValidationResult<T> {
  valid: boolean;
  errors: string[];
  data?: T;
}

/**
 * Validates data against a schema
 */
export function validateSchema<T = Record<string, unknown>>(
  data: unknown,
  schemaObj: ObjectSchema
): ValidationResult<T> {
  const errors: string[] = [];

  function validateField(value: unknown, fieldSchema: FieldSchema, path: string): ValidatedValue {
    // Handle undefined/null values
    if (value === undefined || value === null) {
      if (!fieldSchema.optional) {
        if (fieldSchema.default !== undefined) {
          return fieldSchema.default as ValidatedValue;
        }
        errors.push(`${path}: Required field is missing`);
        return undefined;
      }
      return fieldSchema.default as ValidatedValue;
    }

    // Type validation
    switch (fieldSchema.type) {
      case 'string':
        if (typeof value !== 'string') {
          errors.push(`${path}: Expected string, got ${typeof value}`);
          return fieldSchema.default as ValidatedValue;
        }
        if (fieldSchema.enum && !fieldSchema.enum.includes(value)) {
          errors.push(`${path}: Value must be one of [${fieldSchema.enum.join(', ')}]`);
          return fieldSchema.default as ValidatedValue;
        }
        break;

      case 'number':
        if (typeof value !== 'number') {
          errors.push(`${path}: Expected number, got ${typeof value}`);
          return fieldSchema.default as ValidatedValue;
        }
        if (fieldSchema.validate && !fieldSchema.validate(value)) {
          errors.push(`${path}: Validation failed`);
          return fieldSchema.default as ValidatedValue;
        }
        break;

      case 'boolean':
        if (typeof value !== 'boolean') {
          errors.push(`${path}: Expected boolean, got ${typeof value}`);
          return fieldSchema.default as ValidatedValue;
        }
        break;

      case 'enum':
        if (typeof value !== 'string' || !fieldSchema.enum?.includes(value)) {
          errors.push(`${path}: Value must be one of [${fieldSchema.enum?.join(', ')}]`);
          return fieldSchema.default as ValidatedValue;
        }
        break;

      case 'object':
        if (typeof value !== 'object' || Array.isArray(value) || value === null) {
          errors.push(`${path}: Expected object, got ${typeof value}`);
          return fieldSchema.default as ValidatedValue;
        }
        if (fieldSchema.properties) {
          const result: Record<string, unknown> = {};
          const valueObj = value as Record<string, unknown>;
          for (const [key, propSchema] of Object.entries(fieldSchema.properties)) {
            result[key] = validateField(valueObj[key], propSchema, `${path}.${key}`);
          }
          return result;
        }
        break;

      case 'array':
        if (!Array.isArray(value)) {
          errors.push(`${path}: Expected array, got ${typeof value}`);
          return fieldSchema.default as ValidatedValue;
        }
        if (fieldSchema.itemType) {
          return value.map((item, index) =>
            validateField(item, fieldSchema.itemType!, `${path}[${index}]`)
          );
        }
        break;
    }

    return value as ValidatedValue;
  }

  const validatedData: Record<string, unknown> = {};
  const dataObj = (typeof data === 'object' && data !== null ? data : {}) as Record<string, unknown>;

  for (const [key, fieldSchema] of Object.entries(schemaObj)) {
    validatedData[key] = validateField(dataObj[key], fieldSchema, key);
  }

  return {
    valid: errors.length === 0,
    errors,
    data: errors.length === 0 ? (validatedData as T) : undefined,
  };
}

/**
 * Deeply merges default values into data
 */
export function applyDefaults<T = Record<string, unknown>>(data: Partial<T>, schemaObj: ObjectSchema): T {
  const result: Record<string, unknown> = { ...(data as Record<string, unknown>) };

  for (const [key, fieldSchema] of Object.entries(schemaObj)) {
    if (result[key] === undefined && fieldSchema.default !== undefined) {
      result[key] = fieldSchema.default;
    }

    if (fieldSchema.type === 'object' && fieldSchema.properties && result[key]) {
      result[key] = applyDefaults(
        result[key] as Partial<Record<string, unknown>>,
        fieldSchema.properties
      );
    }
  }

  return result as T;
}
