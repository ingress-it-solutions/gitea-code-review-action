### Simplify code reviews, just say `openai`!

# OpenAI Code Review

A Gitea Action that uses OpenAI to analyze code in pull request comments.

## Usage

To use this action in your workflow, add the following step:

```yaml
name: OpenAI Code Review
uses: bhavik/gitea-code-review-action@v0.1
with:
    PROGRAMMING_LANGUAGE: 'JavaScript'
    REVIEW_COMMENT_PREFIX: 'openai:'
    FULL_REVIEW_COMMENT: 'openai'
    OPENAI_TOKEN: ${{ secrets.OPENAI_TOKEN }}
    GITHUB_TOKEN: ${{ secrets.GH_TOKEN }}
```

## Inputs

This action accepts the following inputs:

- `PROGRAMMING_LANGUAGE` (optional): The programming language of the code in the GitHub repository. If not provided, the detected programming language will be used.
- `OPENAI_TOKEN` (required): The API token for the OpenAI ChatGPT API.
- `GITHUB_TOKEN` (required): The API token for the Github API.
- `FULL_REVIEW_COMMENT` (required): The comment to trigger code review for the pull request.
- `REVIEW_COMMENT_PREFIX` (required): The comment prefix to trigger code review with the comment.
- `GITHUB_BASE_URL` (optional): The base URL for the GitHub API.
- `MAX_CODE_LENGTH` (optional): The maximum code length for the pull request code to be sent to OpenAI. The default value is 6000.
- `PROMPT_TEMPLATE` (optional): The template for the FULL_REVIEW_COMMENT prompt. The default value is:
```
Please analyze the pull request's code and inform me whether it requires optimization, and provide an explanation for your decision:

${code}
```
- `ANSWER_TEMPLATE` (optional): The template for the answer sent to the GitHub comment. The default value is:
```
AI Code Review:

${answer}
```

## Outputs

This action does not produce any outputs.

## Example workflow

Here's an example workflow that uses this action to analyze code in pull request comments:

```yaml
name: Code Review
on:
  issue_comment:
    types: [created, edited]

jobs:
  code-review:
    runs-on: ubuntu-latest
    if: github.event.comment.user.login == 'bhavik' && startsWith(github.event.comment.body, 'openai')
    steps:
    - name: OpenAI Code Review
      uses: bhavik/gitea-code-review-action@v0.1
      with:
        PROGRAMMING_LANGUAGE: 'JavaScript'
        OPENAI_TOKEN: ${{ secrets.OPENAI_TOKEN }}
        GITHUB_TOKEN: ${{ secrets.GH_TOKEN }}
        FULL_REVIEW_COMMENT: 'openai'
        REVIEW_COMMENT_PREFIX: 'openai:'
```

This workflow runs the `OpenAI Code Review` action when a pull request comment is created or edited. The action uses the `PROGRAMMING_LANGUAGE`, `FULL_REVIEW_COMMENT`, `REVIEW_COMMENT_PREFIX`, `OPENAI_TOKEN` and `GITHUB_TOKEN` input values to analyze the code in the pull request comment.

You can also trigger github action when a pull request opened.

## Github

### Code Review for PR

If a comment exactly matches `openai`, a code review will be triggered for the pull request's diff.

Note that only the first 6000 characters of code will be used due to the token limit of the OpenAI API.

### Code Review for a specific file

If a comment starts with `openai:`, you can use it to communicate with ChatGPT just like you would in the official interface.

To reference the diff code of the pull request in your comment, use ${code}:

```
openai: Please explain the usage of the `getPrCode` function:

${code}
```

To reference the diff code of a specific file in the pull request, use ${file:filename}:

```
openai: Can you check if there are any bugs in the following code?

${file:dist/index.js}
```

## Screenshots

## More Examples

## License

The code in this repository is licensed under the MIT license. See `LICENSE` for more information.
