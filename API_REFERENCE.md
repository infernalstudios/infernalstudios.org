# API Reference

### Table of contents
  - [Quick intro](#quick-intro)
  - [Status](#status)
    - [GET `/status`](#get-status)
  - [Authentication](#authentication)
    - [GET `/auth/token`](#get-authtoken)
    - [POST `/auth/token`](#post-authtoken)
    - [DELETE `/auth/token`](#delete-authtoken)
  - [Redirects](#redirects)
    - [GET `/redirects`](#get-redirects)
    - [POST `/redirects`](#post-redirects)
    - [GET `/redirects/{id}`](#get-redirectsid)
    - [PUT `/redirects/{id}`](#put-redirectsid)
    - [DELETE `/redirects/{id}`](#delete-redirectsid)

### Quick intro

All API paths are prepended with `/api`.

If an api requires authentication it will have a star before its method, in which case a token through the `authentication` header must be provided.<br>
For <span>infernalstudios.org</span><!-- Span tags added to not create a link --> in specific, the tokens are provided on a case-by-case basis.

The parameter fields will be provided with a table, they **must** be sent with json in the request body with the header `Content-Type: application/json`.<br>
If a parameter is required, it will have a star after its type.<br>
If an API endpoint doesn't accept parameters, a table won't be provided.<br>

If an error occurs, a non-2xx HTTP status code will be sent.<br>
Along with an error status code, an error response will be provided with a message:
```json
{
  "errors": [ "This is an error message!" ]
}
```
An exception may be a 5xx HTTP status code, where the server may not be able to send such an error. It is best practice to check if the server has sent a valid response, and use that if needed.
There may also be a 400 Bad Request error response when invalid parameters have been provided. Most of these errors aren't documented.

## Status

### GET `/status`
This endpoint will always return a 200 HTTP status code, and will send a hard-coded response.

#### Response
```json
{
  "status": "ok"
}
```

## Authentication
The authentication API provides and validates tokens to use in APIs.<br>
Tokens are random base64url encoded strings (a-z, A-Z, 0-9, _, -) with a length of 86 characters.

### *GET `/auth/token`
Just like [GET `/status`](#get-status), this endpoint will always **try** to return a 200 HTTP status code, however if the provided token is invalid, it will provide an error.<br>
This error will always be the same if an invalid token is provided for every endpoint. The same goes for if a token is not provided.

#### Response:
```json
{
  "status": "ok"
}
```

#### Errors:
```json
401 Unauthorized
{
  "errors": [ "A token is required for this endpoint" ]
}
```

```json
401 Unauthorized
{
  "errors": [ "The provided token is invalid" ]
}
```

### *POST `/auth/token`
Create a new token.

#### Response:
Responds with the new token.
```json
{
  "id": "ThisIsNotARealToken-cLb2b6ABZSobehYeC5BftX1QtzTr_QbiqLkK3AgFos1ReaY1bgubyXzgZWo1EFKk6A"
}
```

### *DELETE `/auth/token`
Delete a token.

#### Parameters
| Field | Type    | Description |
|-------|---------|-------------|
| id | string* | A token to delete, must not be the same one as the one which is used in this request |

#### Response
Responds with the deleted token.
```json
{
  "id": "ThisIsNotARealToken-cLb2b6ABZSobehYeC5BftX1QtzTr_QbiqLkK3AgFos1ReaY1bgubyXzgZWo1EFKk6A"
}
```

#### Errors

```json
400 Bad Request
{
  "id": "Cannot delete the same token as the one which is used for this request"
}
```

```json
404 Not Found
{
  "id": "The provided token could not be found"
}
```


## Redirects
A redirect will point from `https://infernalstudios.org/{path}` to `{url}` with a 302 redirect.

#### Redirect limitations:

A redirect's id must only contain characters `a-z A-Z 0-9 _ -`.

A redirect's name must only contain characters `a-z A-Z 0-9 _ - / \` and spaces.

A redirect's url must be a url.<sup>duh!</sup>

A redirect's path must contain only the allowed characters `a-z A-Z 0-9 _ - /`, and at least 4 non-`/` characters.<br>
The path cannot contain multiple consecutive `/` characters.<br>
If the path has a `/` character as its first or last character, it will be removed, however no error will be returned; beware of this when creating an API wrapper.

### GET `/redirects`
Get all redirects.

#### Response:
Returns an array of all redirects.
```json
[
  {
    "id": "example",
    "name": "Example Redirect",
    "url": "https://example.com/",
    "path": "example"
  }
]
```

#### Errors:
This endpoint shouldn't return any errors.

### *POST `/redirects`
Create a new redirect.

#### Parameters
| Field | Type    | Description |
|-------|---------|-------------|
| id    | string* | A **unique** id for the new redirect.<br>Will throw a [400 error](#post-redirects-existing-id) if an existing id is provided. |
| name  | string  | A name for the redirect.<br>Defaults to the provided path. |
| url   | string* | A URL that the redirect points to. |
| path  | string* | The path that this redirect occupies. Must be **unique**.<br>Will throw a [400 error](#post-redirects-existing-path) if an existing path is provided. |

#### Response:
Responds with the new redirect.
```json
{
  "id": "example",
  "name": "Example Redirect",
  "url": "https://example.com/",
  "path": "example"
}
```

#### Errors:

<span id="post-redirects-existing-id">Id already exists:</span>

```json
400 Bad Request
{
  "errors": [ "A redirect with an id of \"{id}\" already exists" ]
}
```

<span id="post-redirects-existing-path">Path already exists:</span>

```json
400 Bad Request
{
  "errors": [ "A redirect with a path of \"{path}\" already exists" ]
}
```

### GET `/redirects/{id}`
Get a redirect with an id.

#### Response:
Responds with the found redirect.
```json
{
  "id": "example",
  "name": "Example Redirect",
  "url": "https://example.com/",
  "path": "example"
}
```

#### Errors:

<span id="get-redirects-missing-id">Id not found:</span>

```json
404 Not Found
{
  "errors": [ "A redirect with an id of \"{id}\" cannot be found" ]
}
```


### *PUT `/redirects/{id}`
Modifies an existing redirect.<br>
Parameters are optional, only the provided parameters are modified.

| Field | Type   | Description |
|-------|--------|-------------|
| name  | string | A name for the redirect.<br>Defaults to the provided path. |
| url   | string | A URL that the redirect points to. |
| path  | string | The path that this redirect occupies. Must be **unique**.<br>Will throw a [400 error](#put-redirects-id-existing-path) if an existing path is provided. |

#### Errors:

<span id="post-redirects-missing-id">Id not found:</span><br>

```json
404 Not Found
{
  "errors": [ "A redirect with an id of \"{id}\" cannot be found" ]
}
```

<span id="post-redirects-existing-path">Path already exists:</span>

```json
400 Bad Request
{
  "errors": [ "A redirect with a path of \"{path}\" already exists" ]
}
```

### *DELETE `/redirects/{id}`
Deletes an existing redirect.<br>

#### Response:
Responds with the deleted redirect.
```json
{
  "id": "example",
  "name": "Example Redirect",
  "url": "https://example.com/",
  "path": "example"
}
```

#### Errors:

<span id="post-redirects-missing-id">Id not found:</span><br>

```json
404 Not Found
{
  "errors": [ "A redirect with an id of \"{id}\" cannot be found" ]
}
```

<br><br><hr>

<p align="center">
  <a href="#api-reference">Back to the top</a>
</p>