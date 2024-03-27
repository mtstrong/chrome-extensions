console.log('This is a popup!');
var query = { active: true, currentWindow: true };
chrome.tabs.query(query, callback);
function callback(tabs) {
    var currentTab = tabs[0]; // there will be only one in this array
    console.log(currentTab.title); // also has properties like currentTab.id
    var activeTabId = currentTab.id;
    console.log(document)
}
