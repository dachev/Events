/* CSS2XPATH (Still under development)
 * Copyright (c) James Padolsey
 * ---
 * [THIS SCRIPT IS CONTINUALLY UPDATED]
 * LAST UPDATED: 21/03/09
 * CURRENT VERSION: 0.31
 * LOG: http://james.padolsey.com/scripts/javascript/css2xpath_log.txt
 * ---
 * Has been tested on the following selectors:
 * CSS2XPATH('div a');                        //  =>  //div//a
 * CSS2XPATH('div#intro a.active');           //  =>  //div[@id='intro']//a[contains(concat(' ',@class,' '),' active ')]
 * CSS2XPATH('#apple pear.lemon');            //  =>  //*[@id='apple']//pear[contains(concat(' ',@class,' '),' lemon ')]
 * CSS2XPATH('ul.nav li:first-child a');      //  =>  //ul[contains(concat(' ',@class,' '),' nav ')]//li[1]//a
 * CSS2XPATH('body > div > p:nth-child(3)');  //  =>  //body/div/p[3]
 * CSS2XPATH('li > input[type="text"]');      //  =>  //li/input[@type="text"]
 */
 
function CSS2XPATH(selector) {
    selector = ' ' + selector;
    /* The order in which items are replaced is IMPORTANT! */
    var regex = [
            /* All blocks of 2 or more spaces */
            [/\s{2,}/g, function(){
                return ' ';
            }],
            /* additional selectors (comma seperated) */
            [/\s*,\s*/g, function(){
                return '|//';
            }],
            /* Attribute selectors */
            [/[\s\/]?\[([^\]]+)\]/g, function(m,kv){
                return (m.substr(0,1).match(/[\s\/]/) ? '*' : '') + '[@' + kv + ']';
            }],
            /* :nth-child(n) */
            [/:nth-child\((\d+)\)/g, function(m,n){
                return '[' + n + ']';
            }],
            /* :last-child */
            [/:last-child/g, function(m,n){
                return '[last()]';
            }],
            /* :first-child */
            [/:first-child/g, function(m,n){
                return '[1]';
            }],
            /* "sibling" selectors */
            [/\s*\+\s*([^\s]+?)/g, function(m, sib){
                return '/following-sibling::' + sib + '[1]';
            }],
            /* "child" selectors */
            [/\s*>\s*/g, function(){
                return '/';
            }],
            /* Remaining Spaces */
            [/\s/g, function(){
                return '//';
            }],
            /* #id */
            [/([a-z0-9]?)#([a-z][-a-z0-9_]+)/ig, function(m,pre,id){
                return pre + (m.match(/^[a-z0-9]/)?'':'*') + '[@id=\'' + id + '\']';
            }],
            /* .className */
            [/([a-z0-9]?)\.([a-z][-a-z0-9]+)/ig, function(m,pre,cls){
                return pre + (m.match(/^[a-z0-9]/)?'':'*') + '[contains(concat(\' \',@class,\' \'),\' ' + cls + ' \')]';
            }]
        ],
        len = regex.length;
    for (var i = 0; i < len; i++) {
        selector = selector.replace(regex[i][0], regex[i][1]);
    }
    return selector.match(/^\/\//) ? selector : '//' + selector;
}