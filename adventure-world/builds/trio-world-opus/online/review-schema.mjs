export const REVIEW_VERSION='trio-review-1';
export const RATING_FIELDS=[['overall','整体体验','Overall experience'],['fun','好玩程度','Enjoyment'],['visuals','画面与声音','Visuals and sound'],['controls','操作与触屏','Controls and touch'],['guidance','任务是否清楚','Quest clarity'],['network','联机是否稳定','Network stability'],['teamwork','合作体验','Cooperation']];
export const REFLECTIONS=[['favorite','最喜欢的部分，以及为什么','Favourite part and why'],['improvement','最希望改进什么，以及理由','Most important improvement and why'],['learning','这次理解了什么工程知识？用自己的话解释','What engineering idea did you understand? Explain in your own words.'],['expression','怎样更清楚地向 AI 描述要求？写一个例子','How would you explain a requirement to AI more clearly? Give an example.']];
export const KNOWLEDGE=[['shared-state','共享状态与个人进度','Shared state and personal progress'],['network','客户端与服务器','Client and server'],['testing','复现问题与测试','Reproduction and testing'],['requirements','目标、条件与验收','Goals, constraints and acceptance'],['persistence','保存与刷新恢复','Saving and reloading'],['unsure','还不确定，需要再讲解','Not sure yet; I need another explanation']];
export const TASKS=[['走到大厅喷泉','Reach the plaza fountain'],['进入主题乐园','Enter the theme park'],['使用超级跳','Use the super jump'],['使用飞行能力','Use flight'],['收集三颗星星','Collect three stars'],['进入野外生存区','Enter the wilderness'],['采集三个水果','Pick three fruits'],['捡两根木头','Collect two wood'],['点火或在篝火旁取暖','Light or enjoy the campfire'],['进入农场','Enter the farm'],['喂养两次动物','Feed animals twice'],['收集两个农产品','Collect two animal products'],['共同完成五阶段小屋','Complete the five-stage cabin'],['回大厅喷泉互动庆祝','Return to the fountain and interact to celebrate']];
const clean=(x,n)=>typeof x==='string'?x.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g,'').trim().slice(0,n):'';
export function validateReview(input){
 const errors=[],x=input&&typeof input==='object'?input:{};
 const enumValue=(key,allowed)=>{if(!allowed.includes(x[key]))errors.push(key);return x[key];};
 const ratings={};for(const[k]of RATING_FIELDS){const v=x.ratings?.[k];if(!Number.isInteger(v)||v<1||v>5)errors.push('ratings.'+k);else ratings[k]=v;}
 const notes={};for(const[k]of REFLECTIONS){notes[k]=clean(x.notes?.[k],800);if(notes[k].length<3)errors.push('notes.'+k);}
 const device=enumValue('device',['ipad','computer','android','other']);
 const browser=enumValue('browser',['safari','chrome','edge','firefox','other']);
 const orientation=enumValue('orientation',['landscape','portrait']);
 const replay=enumValue('replay',['yes','maybe','no']);
 const difficulty=enumValue('difficulty',['too-easy','right','too-hard']);
 const knowledge=Array.isArray(x.knowledge)?[...new Set(x.knowledge)].filter(v=>KNOWLEDGE.some(k=>k[0]===v)):[];if(!knowledge.length)errors.push('knowledge');
 const bug={present:x.bug?.present===true};if(typeof x.bug?.present!=='boolean')errors.push('bug.present');
 if(bug.present){for(const k of ['steps','expected','actual']){bug[k]=clean(x.bug[k],800);if(bug[k].length<3)errors.push('bug.'+k);}bug.severity=x.bug.severity;if(!['minor','major','blocked'].includes(bug.severity))errors.push('bug.severity');}
 if(x.consent!==true)errors.push('consent');
 const submissionId=clean(x.submissionId,80);if(!/^[a-zA-Z0-9_-]{16,80}$/.test(submissionId))errors.push('submissionId');
 return {ok:!errors.length,errors,value:{schema:REVIEW_VERSION,submissionId,device,browser,orientation,ratings,difficulty,replay,knowledge,notes,bug,consent:true,language:x.language==='en'?'en':'zh-CN'}};
}
