import fs from "fs";
import { pipeline } from "stream/promises";

import { ObjectUtil } from "..";
import * as Json from "./json";
import * as Logger from "./logger";
import * as R from "./runtypes";
import { isObject } from "./util";

export async function downloadFile(
  url: string,
  path: fs.PathLike,
): Promise<void> {
  const a = await fetch(url);
  const b = a.body;

  if (!b) throw new Error("No body in response");
  const c = b as unknown as NodeJS.ReadableStream;

  return pipeline(c, fs.createWriteStream(path));
}

type CommonOptions = {
  body: string | Record<string, unknown>;
  headers: RequestInit["headers"];
} & {
  responseAsText: boolean;
};

function getRequestParams(
  method: string,
  options?: Partial<CommonOptions>,
): RequestInit {
  const headers = options?.headers;
  const body = isObject(options?.body)
    ? Json.stringify(options.body)
    : options?.body;

  const requestParams: RequestInit = {
    method,
    headers,
    body,
  };

  return requestParams;
}

async function doRequest<T>(
  url: string,
  method: "GET" | "POST" | "PUT" | "DELETE",
  runtype: R.Runtype<T>,
  options?: Partial<CommonOptions>,
): Promise<T> {
  const requestParams = getRequestParams(method, options);

  Logger.debug("http request params", requestParams);
  const response = await fetch(url, requestParams);

  if (!response.ok) {
    const text = await response.text();
    const { statusText, status } = response;
    throw new Error(`${method} request failed`, {
      cause: { status, statusText, url, requestParams, text },
    });
  }

  const responseData = options?.responseAsText
    ? await response.text()
    : await response.json();

  const typedJson = R.assertType(runtype, responseData);

  return typedJson;
}

type GetOptions = CommonOptions & {
  queryParams: Record<string, string | undefined>;
};

export async function get<T>(
  url: string,
  runtype: R.Runtype<T>,
  options?: Partial<GetOptions>,
): Promise<T> {
  const fullUrl = options?.queryParams
    ? `${url}?${new URLSearchParams(ObjectUtil.removeUndefinedValues(options.queryParams)).toString()}`
    : url;

  return await doRequest(fullUrl, "GET", runtype, options);
}

export async function put<T>(
  url: string,
  runtype: R.Runtype<T>,
  options?: Partial<GetOptions>,
): Promise<T> {
  return await doRequest(url, "PUT", runtype, options);
}

export async function post<T>(
  url: string,
  runtype: R.Runtype<T>,
  options?: Partial<CommonOptions>,
): Promise<T> {
  return await doRequest(url, "POST", runtype, options);
}

export async function del<T>(
  url: string,
  runtype: R.Runtype<T>,
  options?: Partial<CommonOptions>,
): Promise<T> {
  return await doRequest(url, "DELETE", runtype, options);
}
