import { Component, Input, VERSION } from "@angular/core";
import { FormControl } from "@angular/forms";
import { APIDetail } from "./APIDetail";
@Component({
  selector: "my-app",
  templateUrl: "./app.component.html",
  styleUrls: ["./app.component.css"]
})
export class AppComponent {
  name = "CPQ API Analyzer " + "1.0";
  userSelectionOnlyAPI: boolean = false;
  userSelectionGrouped: boolean = false;
  userSelectionRawAPI: boolean = true;
  fileNameToUse: string = "report";
  fileToUpload: File = null;
  handleOnlyAPIChange = evt => {
    this.userSelectionOnlyAPI = evt.target.checked;
    this.userSelectionGrouped = false;
    this.userSelectionRawAPI = false;
  };
  handleGroupeChange = evt => {
    this.userSelectionGrouped = evt.target.checked;
    this.userSelectionOnlyAPI = false;
    this.userSelectionRawAPI = false;
  };
  handleRawApiChange = evt => {
    this.userSelectionRawAPI = evt.target.checked;
    this.userSelectionOnlyAPI = false;
    this.userSelectionGrouped = false;
  };
  resetFileName = evt => {
    //reset
    evt.target.value = null;
  };
  handleFileInput = event => {
    var self = this;
    function getLevel() {
      let lvl;
      if (self.userSelectionGrouped) lvl = "Fine";
      else if (self.userSelectionOnlyAPI) lvl = "Coarse";
      else if (self.userSelectionRawAPI === true) lvl = "Raw";
      return lvl;
    }
    function getFileNamePrefix() {
      let lvl;
      if (self.userSelectionGrouped) lvl = "groupedaction";
      else if (self.userSelectionOnlyAPI) lvl = "groupedapi";
      else if (self.userSelectionRawAPI === true) lvl = "rawapi";
      return lvl;
    }
    let fileList: FileList = event.target.files;
    let apiList: String[] = ["updatePrice", "updateCartLineItems"];
    if (fileList.length > 0) {
      let file: File = fileList[0];
      self.fileNameToUse = file.name;
      let reader = new FileReader();
      reader.onload = e => {
        var self = this;
        let csvToUse;
        let parsedApis = new Map();
        let nonParsedApis = new Map();
        let rawApis: APIDetail[] = [];
        let allData = new Map();
        let allOtherTime = 0;
        let allOtherCallCount = 0;
        let superMap: [Map<string, APIDetail>, Map<string, APIDetail>];
        var jsonDt = JSON.parse(e.target.result.toString());
        // console.log(jsonDt) ;
        var jsonObj = jsonDt.log.entries;
        //console.log(jsonObj) ;
        let flatten = function(data) {
          var result = {};
          function addDataWithinMaps(theMap, key, dataTowork, action) {
            if (theMap.get(key) == null) {
              if (dataTowork.time != null) {
                let recTime = new APIDetail(); //[number, number];
                recTime.NetTime = dataTowork.time;
                recTime.NumberOfCalls = 1;
                recTime.APIName = key;
                recTime.BlockTime = dataTowork.timings.blocked;
                recTime.WaitTime = dataTowork.timings.wait;
                recTime.RecieveTime = dataTowork.timings.receive;
                recTime.MarkerAction = action;
                theMap.set(key, recTime);
              }
            } else {
              //get the value to add
              if (dataTowork.time != null) {
                let recTime = theMap.get(key);
                recTime.NetTime += dataTowork.time;
                recTime.NumberOfCalls++;
                recTime.APIName = key;
                recTime.BlockTime = dataTowork.timings.blocked;
                recTime.WaitTime = dataTowork.timings.wait;
                recTime.RecieveTime = dataTowork.timings.receive;
                recTime.MarkerAction = action;
                theMap.set(key, recTime);
              }
            }
          }
          function search(payLoad) {
            let addtoList = function(
              action,
              category,
              cpqMethod,
              req,
              parseStrategy
            ) {
              var setter;
              switch (parseStrategy) {
                case "Coarse": {
                  addDataWithinMaps(parsedApis, cpqMethod, req, action);
                  break;
                }
                case "Fine": {
                  addDataWithinMaps(parsedApis, category, req, action);
                  break;
                }
                case "Raw": {
                  setter = rawApis;
                  let data = new APIDetail();
                  data.APIName = cpqMethod;
                  data.NetTime = req.time;
                  data.NumberOfCalls = 1;
                  data.BlockTime = req.timings.blocked;
                  data.WaitTime = req.timings.wait;
                  data.RecieveTime = req.timings.receive;
                  data.MarkerAction = action;
                  setter.push(data);
                  //addDataWithinMaps(rawApis,cpqMethod,req) ;
                  break;
                }
                default: {
                  setter = rawApis;
                  let data = new APIDetail();
                  data.APIName = cpqMethod;
                  data.NetTime = req.time;
                  data.NumberOfCalls = 1;
                  data.BlockTime = req.timings.blocked;
                  data.WaitTime = req.timings.wait;
                  data.RecieveTime = req.timings.receive;
                  data.MarkerAction = action;
                  setter.push(data);
                  break;
                }
              }
            };
            let i = 1;
            function addAction() {
              return "Action" + i++;
            }
            function initializeMaps() {
              parsedApis = new Map();
              nonParsedApis = new Map();
              let superMap: [Map<string, APIDetail>, Map<string, APIDetail>];
              superMap = [parsedApis, nonParsedApis];
              action = addAction();
              allData.set(action, superMap);
            }
            superMap = [parsedApis, nonParsedApis];
            var action = addAction();

            allData.set(action, superMap);
            for (let entry of payLoad) {
              if (
                entry.request.method == "POST" &&
                entry.request.postData != null &&
                !(
                  (entry.request.postData.text != null &&
                    entry.request.postData.text.includes("long-polling")) ||
                  entry.request.url.includes("cometd/24.0/")
                )
              ) {
                let apiInLoad = entry.request.postData.text;
                let postJData;
                try {
                  postJData = JSON.parse(apiInLoad);
                } catch (e) {
                  continue;
                }
                if (postJData.method == "performAction") {
                  if (
                    postJData.data != null &&
                    postJData.data[0] != null &&
                    ((postJData.data[0].displayAction != null &&
                      postJData.data[0].displayAction.ActionLabelName ==
                        "QuickSave") ||
                      superMap.entries.length == 0)
                  ) {
                    initializeMaps();
                  }
                } else {
                  //  debugger ;
                  console.log("Method :" + postJData.method);
                  var downloadGrouped = document.getElementById("groupedAPI");
                  let refineLevel = getLevel();

                  switch (postJData.method) {
                    case "updatePrice":
                    case "updateCartTotals":
                    case "updateCartLineItems": {
                      addtoList(
                        action,
                        "Pricing",
                        postJData.method,
                        entry,
                        refineLevel
                      );
                      break;
                    }
                    case "updateLineItemSequence":
                    case "cloneBundleLineItem": {
                      addtoList(
                        action,
                        "Copy Cart Lines",
                        postJData.method,
                        entry,
                        refineLevel
                      );
                      break;
                    }
                    case "getGuidePageUrl":
                    case "getRecommendedProducts":
                    case "getGuidePageUrl":
                    case "getCategories": {
                      addtoList(
                        action,
                        "LaunchCatalog",
                        postJData.method,
                        entry,
                        refineLevel
                      );
                    }
                    case "executeConstraintRules":
                    case "configureBundle":
                    case "getConstraintRuleProducts":
                    case "saveConstraintsResults":
                    case "addToCart": {
                      addtoList(
                        action,
                        "AddToCart",
                        postJData.method,
                        entry,
                        refineLevel
                      );
                      break;
                    }
                    case "searchFavoriteConfigurations":
                    case "getProductGroups":
                    case "searchProducts":
                    case "getConfigurationData": {
                      addtoList(
                        action,
                        "SearchProducts",
                        postJData.method,
                        entry,
                        refineLevel
                      );
                      break;
                    }
                    case "createRollupSummaryGroupsForConfigCart":
                    case "initCart":
                    case "getCartSummary":
                    case "getConfigCartDO":
                    case "getDefaultLineItemRollup":
                    case "getCart":
                    case "getCartLineNumbers":
                    case "getLineItemFieldsMetaData":
                    case "getSObjectPermissions":
                    case "getAllCartViews":
                    case "getObjectForSummary":
                    case "getAnalyticsRecommendedProducts":
                    case "getReferenceObjects":
                    case "getCartLineItems":
                    case "getChildCartLineItems":
                    case "getProductDetails": {
                      addtoList(
                        action,
                        "CartLaunch",
                        postJData.method,
                        entry,
                        refineLevel
                      );
                      break;
                    }
                    default: {
                      if (refineLevel == "Fine") {
                        addDataWithinMaps(
                          nonParsedApis,
                          postJData.method,
                          entry,
                          action
                        );
                      } else {
                        addtoList(
                          action,
                          postJData.method,
                          postJData.method,
                          entry,
                          refineLevel
                        );
                      }
                      console.log("Defaulted method: " + postJData.method);
                      console.log("Untracked data: " + JSON.stringify(entry));
                      break;
                    }
                  }
                }
              } else {
                allOtherTime += entry.time;
                allOtherCallCount++;
                console.log("Misc call URL: " + entry.request.url);
                console.log("Misc call time: " + entry.time);
              }
            }
          }
          search(data);
          return parsedApis;
        };
        let apiData = flatten(jsonObj);
        console.log("Tracked apiData" + JSON.stringify(apiData));
        console.log("Non grouped apiData" + JSON.stringify(nonParsedApis));
        console.log("Non grouped raw apiData" + JSON.stringify(rawApis));
        let downloader = function downloadAsCSV() {
          let csvData: string = "";
          let refineLvl = getLevel();
          console.debug(refineLvl);

          csvData +=
            "ActionGroup" +
            "," +
            "Action Name" +
            "," +
            "Total Time (ms)" +
            "," +
            "Total Calls" +
            "," +
            "Avg Time Per Call";
          if (refineLvl == "Raw") {
            csvData += "," + "Wait Time" + "," + "Block time";
          }
          csvData += "\r\n";
          csvData += "" + "," + "," + "," + ",";
          if (refineLvl == "Raw") {
            csvData += "," + "," + ",";
          }
          csvData += "\r\n";
          if (self.userSelectionRawAPI === true) {
            rawApis.forEach((value: APIDetail) => {
              csvData +=
                value.MarkerAction +
                "," +
                value.APIName +
                "," +
                (value.APIName != "" ? value.NetTime : "") +
                "," +
                (value.APIName != "" ? "1" : "") +
                "," +
                (value.APIName != "" ? value.NetTime : "");
              if (refineLvl == "Raw") {
                csvData +=
                  "," +
                  (value.APIName != "" ? value.WaitTime : "") +
                  "," +
                  (value.APIName != "" ? value.BlockTime : "");
              }
              csvData += "\r\n";
            });
          } else {
            allData.forEach(
              (
                value: [Map<string, APIDetail>, Map<string, APIDetail>],
                key: string
              ) => {
                csvData += key + "," + "," + "," + "," + "\r\n";
                value[0].forEach((value: APIDetail, keyInner: string) => {
                  csvData +=
                    key +
                    "," +
                    keyInner +
                    "," +
                    (keyInner != "" ? value.NetTime : "") +
                    "," +
                    (keyInner != "" ? value.NumberOfCalls : "") +
                    "," +
                    (keyInner != ""
                      ? value.NetTime / value.NumberOfCalls
                      : "") +
                    "\r\n";
                });
                csvData +=
                  "--------Non Grouped API------" +
                  "," +
                  "," +
                  "," +
                  "," +
                  "\r\n";
                value[1].forEach((value: APIDetail, keyInner: string) => {
                  csvData +=
                    key +
                    "," +
                    keyInner +
                    "," +
                    (keyInner != "" ? value.NetTime : "") +
                    "," +
                    (keyInner != "" ? value.NumberOfCalls : "") +
                    "," +
                    (keyInner != ""
                      ? value.NetTime / value.NumberOfCalls
                      : "") +
                    "\r\n";
                });
                csvData += "" + "," + "," + "," + "," + "\r\n";
              }
            );
          }
          csvData +=
            "Misc Calls" +
            "," +
            "These are usually GET requests like images|css|etc " +
            "," +
            allOtherTime +
            "," +
            allOtherCallCount +
            "," +
            allOtherTime / allOtherCallCount +
            "\r\n";
          var blob = new Blob([csvData], { type: "text/csv" });
          var url = window.URL.createObjectURL(blob);
          function getfileNameToUse() {
            return self.fileNameToUse + "_" + getLevel() + ".csv";
          }
          if (navigator.msSaveOrOpenBlob) {
            navigator.msSaveBlob(blob, getfileNameToUse());
          } else {
            var a = document.createElement("a");
            a.href = url;
            a.download = getfileNameToUse();
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
          }
          window.URL.revokeObjectURL(url);
        };
        downloader();
      };
      try {
        reader.readAsText(file);
        //eval("remotingcall('Download',getLevel(),'HARParser','Success')");
      } catch (error) {
        alert(
          "Problem processing HAR. Please contact support : Error -" + error
        );
        //eval("remotingcall('Download',getLevel(),'HARParser'," + error + ")");
      }
    }
  };
}
