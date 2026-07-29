import { mapPool } from '../lib/fs.js';

/**
 * Export specification groups/fields/values for each category.
 */
export async function exportSpecs(client, categoryIds, concurrency = 2) {
  const byCategory = {};
  const groups = [];
  const fields = [];
  const fieldValues = [];

  await mapPool(categoryIds, concurrency, async (categoryId) => {
    try {
      const { data } = await client.get(
        `/api/catalog_system/pvt/specification/groupbycategory/${categoryId}`,
      );
      const groupsForCat = Array.isArray(data) ? data : [];
      byCategory[categoryId] = groupsForCat;

      for (const group of groupsForCat) {
        groups.push({
          categoryId,
          GroupId: group.GroupId ?? group.Id,
          Name: group.Name,
          raw: group,
        });
        const groupFields = group.CategorySpecifications || group.Fields || [];
        for (const field of groupFields) {
          const fieldId = field.FieldId ?? field.Id;
          fields.push({
            categoryId,
            groupId: group.GroupId ?? group.Id,
            fieldId,
            Name: field.Name,
            raw: field,
          });

          if (field.FieldValues || field.Values) {
            for (const fv of field.FieldValues || field.Values || []) {
              fieldValues.push({
                fieldId,
                FieldValueId: fv.FieldValueId ?? fv.Id,
                Name: fv.Name ?? fv.Value,
                raw: fv,
              });
            }
          } else if (fieldId) {
            try {
              const { data: values } = await client.get(
                `/api/catalog_system/pvt/specification/fieldValue/${fieldId}`,
              );
              for (const fv of Array.isArray(values) ? values : []) {
                fieldValues.push({
                  fieldId,
                  FieldValueId: fv.FieldValueId ?? fv.Id,
                  Name: fv.Name ?? fv.Value,
                  raw: fv,
                });
              }
            } catch {
              // alguns fields não têm values (texto livre)
            }
          }
        }
      }
    } catch (err) {
      byCategory[categoryId] = { error: err.message };
    }
  });

  return { byCategory, groups, fields, fieldValues };
}
