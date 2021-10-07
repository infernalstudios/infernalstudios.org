# API Reference

All API paths are prepended with `/api`.

If an api requires authentication it will have a star before its method,
in which case a token through the `authentication` header must be provided.<br>
For <span>infernalstudios.org</span><!-- Span tags added to not create a link --> in specific, the tokens are provided on a case-by-case basis, **right now there doesn't exist a way to create new tokens with the API**.

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

## Miscellaneous

### GET `/status`
This endpoint will always return a 200 HTTP status code, and will send a hard-coded response.

#### Response
```json
{
  "status": "ok"
}
```

## Redirects
A redirect will point from `https://infernalstudios.org/{path}` to `{url}` with a 302 redirect.

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