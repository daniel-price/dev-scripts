export type Page<Result, Token> = {
  results: Result[];
  nextToken?: Token;
};

export async function paginate<Result, Token>(
  fetchPage: (token?: Token) => Promise<Page<Result, Token>>,
  initialToken?: Token,
): Promise<Result[]> {
  const results: Result[] = [];
  let nextToken = initialToken;

  do {
    const page = await fetchPage(nextToken);
    results.push(...page.results);
    nextToken = page.nextToken;
  } while (nextToken);

  return results;
}
