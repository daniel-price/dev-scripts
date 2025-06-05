import { SQL } from "bun";
import { cleanEnv, num, str } from "envalid";

export function getSqlClient(): SQL {
  const { PGDATABASE, PGHOST, PGPASSWORD, PGPORT, PGUSER } = cleanEnv(
    process.env,
    {
      PGDATABASE: str(),
      PGHOST: str(),
      PGPASSWORD: str(),
      PGPORT: num(),
      PGUSER: str(),
    },
  );

  return new SQL({
    host: PGHOST,
    port: PGPORT,
    database: PGDATABASE,
    user: PGUSER,
    password: PGPASSWORD,
  });
}
