const core = require('@actions/core');
const github = require('@actions/github');
const axios = require('axios');
const detect = require('language-detect');
const httpsProxyAgent = require('https-proxy-agent');

function configWithProxy(config) {
    var c = config || {};
    if (process.env.OPENAI_PROXY) {
        core.debug(`use proxy: ${process.env.OPENAI_PROXY}`);
        c.proxy = false;
        c.httpsAgent = new httpsProxyAgent(process.env.OPENAI_PROXY);
        return c;
    }
    return c;
}



async function run() {
  try {
    // Get input values
    const programmingLanguage = core.getInput('PROGRAMMING_LANGUAGE');
    const openaiToken = core.getInput('OPENAI_TOKEN');
    const fullReviewComment = core.getInput('FULL_REVIEW_COMMENT');
    const reviewCommentPrefix = core.getInput('REVIEW_COMMENT_PREFIX');
    const githubToken = core.getInput('GITHUB_TOKEN');
    const githubBaseURL = core.getInput('GITHUB_BASE_URL') || process.env.GITHUB_API_URL;
    const promptTemplate = core.getInput('PROMPT_TEMPLATE');
    const codeTemplate = core.getInput('CODE_TEMPLATE');
    const jokeTemplate = core.getInput('JOKE_TEMPLATE');
    const maxCodeLength = core.getInput('MAX_CODE_LENGTH');
    const answerTemplate = core.getInput('ANSWER_TEMPLATE');
    const giteaToken = core.getInput('GITHUB_TOKEN');
    const sourceAt = core.getInput('SOURCE_AT');

    core.debug(`programmingLanguage: ${programmingLanguage}`);
    core.debug(`openaiToken length: ${openaiToken.length}`);
    core.debug(`fullReviewComment: ${fullReviewComment}`);
    core.debug(`reviewCommentPrefix: ${reviewCommentPrefix}`);
    core.debug(`githubToken length: ${githubToken.length}`);
    core.debug(`githubBaseURL: ${githubBaseURL}`);
    core.debug(`promptTemplate: ${promptTemplate}`);
    core.debug(`codeTemplate: ${codeTemplate}`);
    core.debug(`jokeTemplate: ${jokeTemplate}`);
    core.debug(`maxCodeLength: ${maxCodeLength}`);
    core.debug(`answerTemplate: ${answerTemplate}`);
    core.debug(`SourceAt: ${sourceAt}`);

    // Get information about the pull request review
    const comment = github.context.payload.comment;
    const repoName = github.context.payload.repository.name;
    const repoOwner = github.context.payload.repository.owner.login;
    const prNumber = github.context.payload.number || github.context.payload.issue.number; // get number from a pull request event or comment event

    // Get the code to analyze from the review comment
      var content = comment && comment.body || '';
      var completeContent = comment && comment.body || '';
      if(sourceAt === 'github') {

          const url = `${githubBaseURL}/repos/${repoOwner}/${repoName}/pulls/${prNumber}`;
          console.log(`diff url: ${url}`);
          var response = await axios.get(url, {
              headers: {
                  Authorization: `token ${githubToken}`,
                  Accept: 'application/vnd.github.diff'
              }
          });
          const code = response.data;
          core.debug(`diff code: ${code}`);
          const files = parsePullRequestDiff(code);
          core.debug(`diff files: ${files}`);

          if (!content || content == fullReviewComment) {
              // Extract the code from the pull request content
              content = codeTemplate.replace('${code}', code);
          } else {
              content = content.substring(reviewCommentPrefix.length);
              content = content.replace('${code}', code);
              const fileNames = findFileNames(content);
              core.debug(`found files name in commment: ${fileNames}`);
              for (const fileName of fileNames) {
                  for (const key of Object.keys(files)) {
                      if (key.includes(fileName)) {
                          core.debug(`replace \${file:${fileName}} with ${key}'s diff`);
                          content = content.replace(`\${file:${fileName}}`, files[key]);
                          break;
                      }
                  }
              }
          }
          content = content.substring(0, maxCodeLength);
      }
      else if(sourceAt === 'gitea')
      {
          const url = `${githubBaseURL}/api/v1/repos/${repoOwner}/${repoName}/pulls/${prNumber}.diff`;
          console.log(`diff url: ${url}`);
          var response = await axios.get(url, {
              headers: {
                  Authorization: `token ${githubToken}`,
                  Accept: 'application/vnd.github.diff'
              }
          });
          const code = response.data;
          core.debug(`diff code: ${code}`);
          const files = parsePullRequestDiff(code);
          core.debug(`diff files: ${files}`);

          if (!content || content == fullReviewComment) {
              // Extract the code from the pull request content
              content = codeTemplate.replace('${code}', code);
          } else {
              content = content.substring(reviewCommentPrefix.length);
              content = content.replace('${code}', code);
              const fileNames = findFileNames(content);
              core.debug(`found files name in commment: ${fileNames}`);
              for (const fileName of fileNames) {
                  for (const key of Object.keys(files)) {
                      if (key.includes(fileName)) {
                          core.debug(`replace \${file:${fileName}} with ${key}'s diff`);
                          content = content.replace(`\${file:${fileName}}`, files[key]);
                          break;
                      }
                  }
              }
          }
          content = content.substring(0, maxCodeLength);
      }
    // Determine the programming language if it was not provided
    if (programmingLanguage == 'auto') {
        const detectedLanguage = detect(code);
        core.debug(`Detected programming language: ${detectedLanguage}`);
        programmingLanguage = detectedLanguage;
    }

    var messageReview = promptTemplate.replace('${code}', content);
    var messageJoke = jokeTemplate.replace('${code}', content);
    var reviewInputMessages = [{
        role: "system",
        content: `You are a master of programming language ${programmingLanguage}`
    }, {
        role: "user",
        content: messageReview
    }];

      var jokeInputMessages = [{
          role: "system",
          content: `You are a master of programming language ${programmingLanguage}`
      }, {
          role: "user",
          content: messageJoke
      }];

    core.debug(`content: ${content}`);

    // Call the OpenAI ChatGPT API to analyze the code
    responseReview = await axios.post('https://api.openai.com/v1/chat/completions', {
        "model": "gpt-3.5-turbo",
        "messages": reviewInputMessages
    }, configWithProxy({
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiToken}`
      }
    }));

      // Call the OpenAI ChatGPT API to analyze the code
      responseJoke = await axios.post('https://api.openai.com/v1/chat/completions', {
          "model": "gpt-3.5-turbo",
          "messages": jokeInputMessages
      }, configWithProxy({
          headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${openaiToken}`
          }
      }));


    const answer = response.data.choices[0].message.content + '/n/n' + '### Funny Joke about this PR:' +'/n/n' + responseJoke.data.choices[0].message.content;
    core.debug(`openai response: ${answer}`);

    if(sourceAt === 'github') {
        // Reply to the review comment with the OpenAI response
        const octokit = new github.getOctokit(githubToken, {
            baseUrl: githubBaseURL
        });

        await octokit.rest.issues.createComment({
            owner: repoOwner,
            repo: repoName,
            issue_number: prNumber,
            body: answerTemplate.replace('${answer}', answer)

        });
    } else if (sourceAt === 'gitea')
    {


        // Make a POST request to create a comment on a pull request
        const comment = answerTemplate.replace('${answer}', answer);
        const url = `${githubBaseURL}/api/v1/repos/${repoOwner}/${repoName}/issues/${prNumber}/comments`;
        const headers = { 'Content-Type': 'application/json', 'Authorization': `token ${githubToken}` };
        const data = { 'body': `${comment}`};
        core.debug(`url: ${url}`);
        core.debug(`githubToken: ${githubToken}`);
        core.debug(`data.body: ${data.body}`);
        var response = await axios.post(url, data, {
            headers: {
                Authorization: `token ${githubToken}`,
                Accept: 'application/json'
            }
        });
    }
  } catch (error) {
    core.setFailed(error.message);
  }
}

function parsePullRequestDiff(diffContent) {
    const files = {};
    const diffLines = diffContent.split('\n');

    let currentFile = null;
    let currentLines = [];

    for (const line of diffLines) {
      if (line.startsWith('diff --git')) {
        // Start of a new file
        if (currentFile) {
          files[currentFile] = currentLines.join('\n');
        }
        currentFile = line.substring('diff --git'.length + 1);
        currentLines = [line];
      } else {
        // Add the line to the current file's diff
        currentLines.push(line);
      }
    }

    // Add the last file's diff
    if (currentFile) {
      files[currentFile] = currentLines.join('\n');
    }

    return files;
}

function findFileNames(str) {
    const pattern = /\${file:([^{}]+)}/g;
    const matches = str.matchAll(pattern);
    const names = [];
    for (const match of matches) {
      names.push(match[1]);
    }
    return names;
}

run();
