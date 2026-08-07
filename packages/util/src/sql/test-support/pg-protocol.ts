export type CapturedStatement = string | (string | number | Buffer | null)[];

/**
 * Decodes the PostgreSQL wire protocol messages we care about for test
 * assertions: Parse (query text) and Bind (parameter values). All other
 * message types (Execute, Sync, Query, etc.) return null and are ignored.
 */
export function parsePgMessage(buf: Uint8Array): CapturedStatement | null {
  const buffer = Buffer.from(buf);
  const type = String.fromCharCode(buffer[0]);

  if (type === "P") {
    let offset = 5;
    const stmtNameEnd = buffer.indexOf(0, offset);
    if (stmtNameEnd === -1) throw new Error("No null after statement name");

    offset = stmtNameEnd + 1;

    const queryEnd = buffer.indexOf(0, offset);
    if (queryEnd === -1) throw new Error("No null after query string");

    const query = buffer.toString("utf8", offset, queryEnd);

    return query.trim().replace(/\s+/g, " ");
  }

  if (type === "B") {
    let offset = 5;

    const portalEnd = buffer.indexOf(0, offset);
    if (portalEnd === -1) throw new Error("No null after portal name");
    offset = portalEnd + 1;

    const stmtEnd = buffer.indexOf(0, offset);
    if (stmtEnd === -1) throw new Error("No null after statement name");
    offset = stmtEnd + 1;

    const paramFormatCount = buffer.readUInt16BE(offset);
    offset += 2;

    const paramFormats = [];
    for (let i = 0; i < paramFormatCount; i++) {
      paramFormats.push(buffer.readUInt16BE(offset));
      offset += 2;
    }

    const paramCount = buffer.readUInt16BE(offset);
    offset += 2;

    const params: (string | number | Buffer | null)[] = [];

    for (let i = 0; i < paramCount; i++) {
      const paramLen = buffer.readInt32BE(offset);
      offset += 4;

      if (paramLen === -1) {
        params.push(null);
        continue;
      }

      const paramBytes = buffer.subarray(offset, offset + paramLen);
      offset += paramLen;

      if (paramFormats.length === 0 || paramFormats[i] === 0) {
        params.push(paramBytes.toString("utf8"));
      } else if (paramBytes.length === 4) {
        params.push(paramBytes.readInt32BE(0));
      } else if (paramBytes.length === 2) {
        params.push(paramBytes.readInt16BE(0));
      } else if (paramBytes.length === 1) {
        params.push(paramBytes.readInt8(0));
      } else {
        params.push(paramBytes);
      }
    }

    return params;
  }

  return null;
}
