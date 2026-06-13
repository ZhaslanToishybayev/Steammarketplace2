if (typeof File === 'undefined') {
  global.File = class File extends Blob {
    constructor(bits, name, options) {
      super(bits, options);
      this.name = name;
      this.lastModified = options && options.lastModified ? options.lastModified : Date.now();
    }
  };
}
