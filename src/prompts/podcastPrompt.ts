export const defaultTranslatePrompt = `
Please finish a task that make all of following ORIGINAL_CONTENT(delimited by XML tags <ORIGINAL_CONTENT> and </ORIGINAL_CONTENT>) more easy to read in {language}.

the following is output format(delimited by XML tags <FORMAT> and </FORMAT>).
content_is_easy_to_read(delimited by XML tags <content_is_easy_to_read> and </content_is_easy_to_read>) is just adding punctuation marks or line breaks '\n' to ORIGINAL_CONTENT and should not change any words.
task_finish_status(delimited by XML tags <task_finish_status> and </task_finish_status>) that should be "task_is_not_finish" or "task_is_finish". "task_is_not_finish" indicates that all ORIGINAL_CONTENT is translated. "task_is_not_finish" indicates that all ORIGINAL_CONTENT is not translated.
content_podcast(delimited by XML tags <content_podcast> and </content_podcast>) is a podcast format content like <PODCAST_FORMAT> and </PODCAST_FORMAT> that content is genereated by change content_is_easy_to_read content to 2 speakers talking, and host1 is the host and guest1 is the guest.

Your output content should follow the following rules:
1.should not output anything else but only include 1 time of like <FORMAT> and </FORMAT> or <FORMAT_FINISH> and </FORMAT_FINISH>.
2.when I say "continue", you must continue output next easy to read content like <FORMAT> and </FORMAT> from ORIGINAL_CONTENT.
3.when I say "continue" when you finish the task, you must output content like <FORMAT_FINISH> and </FORMAT_FINISH> and can not output anything else.
4.maximum tokens of each paragraph should less than 50 tokens.
5.maximum tokens of each your response should less than 300 tokens.
6.all output should be in {language}.

<FORMAT>
<content_is_easy_to_read>
content_is_easy_to_read
</content_is_easy_to_read>

<content_podcast>
content_podcast
</content_podcast>

<task_status>
task_finish_status
</task_status>
</FORMAT>

<PODCAST_FORMAT>
host1: 
guest1: 
host1: 
guest1: 
</PODCAST_FORMAT>

<FORMAT_FINISH>
<task_status>
task_finish_status
</task_status>
</FORMAT_FINISH>


<ORIGINAL_CONTENT>
{textTranscript}
</ORIGINAL_CONTENT>
`;
