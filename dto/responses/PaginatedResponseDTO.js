/**
 * DTO for paginated response
 */

class PaginatedResponseDTO {
  constructor(items, total, page, limit) {
    this.items = items;
    this.total = total;
    this.page = page;
    this.limit = limit;
    this.pages = Math.ceil(total / limit);
  }

  static fromResult(result, transformer = null) {
    const items = transformer ? result.items.map(transformer) : result.items;
    return new PaginatedResponseDTO(items, result.total, result.page, result.limit);
  }

  toJSON() {
    return {
      items: this.items,
      total: this.total,
      page: this.page,
      limit: this.limit,
      pages: this.pages
    };
  }
}

module.exports = PaginatedResponseDTO;
