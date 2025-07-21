/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
(() => {
var exports = {};
exports.id = "pages/_app";
exports.ids = ["pages/_app"];
exports.modules = {

/***/ "(pages-dir-node)/./src/constants/theme.ts":
/*!********************************!*\
  !*** ./src/constants/theme.ts ***!
  \********************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   theme: () => (/* binding */ theme)\n/* harmony export */ });\n// Centralised theme colours for FVC Protocol\nconst theme = {\n    modalBackground: '#FFFFFF08',\n    modalButton: '#28282C',\n    generalButton: '#F7F8F8',\n    secondaryText: '#8A8F98',\n    primaryText: '#F7F8F8',\n    buttonText: '#08090A',\n    appBackground: '#08090A'\n};\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHBhZ2VzLWRpci1ub2RlKS8uL3NyYy9jb25zdGFudHMvdGhlbWUudHMiLCJtYXBwaW5ncyI6Ijs7OztBQUFBLDZDQUE2QztBQUN0QyxNQUFNQSxRQUFRO0lBQ25CQyxpQkFBaUI7SUFDakJDLGFBQWE7SUFDYkMsZUFBZTtJQUNmQyxlQUFlO0lBQ2ZDLGFBQWE7SUFDYkMsWUFBWTtJQUNaQyxlQUFlO0FBQ2pCLEVBQUUiLCJzb3VyY2VzIjpbIi9ob21lL3N0ZWFrL0Rlc2t0b3AvZnZjLXByb3RvY29sL2RhcHAvc3JjL2NvbnN0YW50cy90aGVtZS50cyJdLCJzb3VyY2VzQ29udGVudCI6WyIvLyBDZW50cmFsaXNlZCB0aGVtZSBjb2xvdXJzIGZvciBGVkMgUHJvdG9jb2xcbmV4cG9ydCBjb25zdCB0aGVtZSA9IHtcbiAgbW9kYWxCYWNrZ3JvdW5kOiAnI0ZGRkZGRjA4JywgLy8gdHJhbnNwYXJlbnQgYmFja2dyb3VuZHMgb2YgbW9kYWxzXG4gIG1vZGFsQnV0dG9uOiAnIzI4MjgyQycsICAgICAgLy8gYnV0dG9ucyBpbnNpZGUgbW9kYWxzXG4gIGdlbmVyYWxCdXR0b246ICcjRjdGOEY4JywgICAgLy8gZ2VuZXJhbCBidXR0b25cbiAgc2Vjb25kYXJ5VGV4dDogJyM4QThGOTgnLCAgICAvLyBzZWNvbmRhcnkgdGV4dFxuICBwcmltYXJ5VGV4dDogJyNGN0Y4RjgnLCAgICAgIC8vIHByaW1hcnkgdGV4dFxuICBidXR0b25UZXh0OiAnIzA4MDkwQScsICAgICAgIC8vIGdlbmVyYWwgYnV0dG9uIHRleHRcbiAgYXBwQmFja2dyb3VuZDogJyMwODA5MEEnLCAgICAvLyBiYWNrZ3JvdW5kIG9mIHRoZSBlbnRpcmUgZGFwcFxufTsgIl0sIm5hbWVzIjpbInRoZW1lIiwibW9kYWxCYWNrZ3JvdW5kIiwibW9kYWxCdXR0b24iLCJnZW5lcmFsQnV0dG9uIiwic2Vjb25kYXJ5VGV4dCIsInByaW1hcnlUZXh0IiwiYnV0dG9uVGV4dCIsImFwcEJhY2tncm91bmQiXSwiaWdub3JlTGlzdCI6W10sInNvdXJjZVJvb3QiOiIifQ==\n//# sourceURL=webpack-internal:///(pages-dir-node)/./src/constants/theme.ts\n");

/***/ }),

/***/ "(pages-dir-node)/./src/pages/_app.tsx":
/*!****************************!*\
  !*** ./src/pages/_app.tsx ***!
  \****************************/
/***/ ((module, __webpack_exports__, __webpack_require__) => {

"use strict";
eval("__webpack_require__.a(module, async (__webpack_handle_async_dependencies__, __webpack_async_result__) => { try {\n__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   \"default\": () => (__WEBPACK_DEFAULT_EXPORT__)\n/* harmony export */ });\n/* harmony import */ var react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react/jsx-dev-runtime */ \"react/jsx-dev-runtime\");\n/* harmony import */ var react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__);\n/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! react */ \"react\");\n/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_1__);\n/* harmony import */ var _styles_globals_css__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! @/styles/globals.css */ \"(pages-dir-node)/./src/styles/globals.css\");\n/* harmony import */ var _styles_globals_css__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(_styles_globals_css__WEBPACK_IMPORTED_MODULE_2__);\n/* harmony import */ var _rainbow_me_rainbowkit_styles_css__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! @rainbow-me/rainbowkit/styles.css */ \"(pages-dir-node)/../node_modules/@rainbow-me/rainbowkit/dist/index.css\");\n/* harmony import */ var _rainbow_me_rainbowkit_styles_css__WEBPACK_IMPORTED_MODULE_3___default = /*#__PURE__*/__webpack_require__.n(_rainbow_me_rainbowkit_styles_css__WEBPACK_IMPORTED_MODULE_3__);\n/* harmony import */ var _rainbow_me_rainbowkit__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! @rainbow-me/rainbowkit */ \"@rainbow-me/rainbowkit\");\n/* harmony import */ var wagmi__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! wagmi */ \"wagmi\");\n/* harmony import */ var wagmi_chains__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! wagmi/chains */ \"wagmi/chains\");\n/* harmony import */ var _tanstack_react_query__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! @tanstack/react-query */ \"@tanstack/react-query\");\n/* harmony import */ var _constants_theme__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(/*! @/constants/theme */ \"(pages-dir-node)/./src/constants/theme.ts\");\nvar __webpack_async_dependencies__ = __webpack_handle_async_dependencies__([_rainbow_me_rainbowkit__WEBPACK_IMPORTED_MODULE_4__, wagmi__WEBPACK_IMPORTED_MODULE_5__, wagmi_chains__WEBPACK_IMPORTED_MODULE_6__, _tanstack_react_query__WEBPACK_IMPORTED_MODULE_7__]);\n([_rainbow_me_rainbowkit__WEBPACK_IMPORTED_MODULE_4__, wagmi__WEBPACK_IMPORTED_MODULE_5__, wagmi_chains__WEBPACK_IMPORTED_MODULE_6__, _tanstack_react_query__WEBPACK_IMPORTED_MODULE_7__] = __webpack_async_dependencies__.then ? (await __webpack_async_dependencies__)() : __webpack_async_dependencies__);\n\n\n\n\n\n\n\n\n\nconst projectId = '54d704a3ccdf59ce20365f11281123bd';\nconst config = (0,_rainbow_me_rainbowkit__WEBPACK_IMPORTED_MODULE_4__.getDefaultConfig)({\n    appName: 'FVC Protocol',\n    projectId,\n    chains: [\n        wagmi_chains__WEBPACK_IMPORTED_MODULE_6__.mainnet,\n        wagmi_chains__WEBPACK_IMPORTED_MODULE_6__.polygon,\n        wagmi_chains__WEBPACK_IMPORTED_MODULE_6__.arbitrum\n    ],\n    ssr: true\n});\nconst queryClient = new _tanstack_react_query__WEBPACK_IMPORTED_MODULE_7__.QueryClient();\nfunction MyApp({ Component, pageProps }) {\n    return /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(\"div\", {\n        style: {\n            background: _constants_theme__WEBPACK_IMPORTED_MODULE_8__.theme.appBackground,\n            minHeight: '100vh',\n            minWidth: '100vw'\n        },\n        children: /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(wagmi__WEBPACK_IMPORTED_MODULE_5__.WagmiProvider, {\n            config: config,\n            children: /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(_tanstack_react_query__WEBPACK_IMPORTED_MODULE_7__.QueryClientProvider, {\n                client: queryClient,\n                children: /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(_rainbow_me_rainbowkit__WEBPACK_IMPORTED_MODULE_4__.RainbowKitProvider, {\n                    children: /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(Component, {\n                        ...pageProps\n                    }, void 0, false, {\n                        fileName: \"/home/steak/Desktop/fvc-protocol/dapp/src/pages/_app.tsx\",\n                        lineNumber: 28,\n                        columnNumber: 13\n                    }, this)\n                }, void 0, false, {\n                    fileName: \"/home/steak/Desktop/fvc-protocol/dapp/src/pages/_app.tsx\",\n                    lineNumber: 27,\n                    columnNumber: 11\n                }, this)\n            }, void 0, false, {\n                fileName: \"/home/steak/Desktop/fvc-protocol/dapp/src/pages/_app.tsx\",\n                lineNumber: 26,\n                columnNumber: 9\n            }, this)\n        }, void 0, false, {\n            fileName: \"/home/steak/Desktop/fvc-protocol/dapp/src/pages/_app.tsx\",\n            lineNumber: 25,\n            columnNumber: 7\n        }, this)\n    }, void 0, false, {\n        fileName: \"/home/steak/Desktop/fvc-protocol/dapp/src/pages/_app.tsx\",\n        lineNumber: 24,\n        columnNumber: 5\n    }, this);\n}\n/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (MyApp);\n\n__webpack_async_result__();\n} catch(e) { __webpack_async_result__(e); } });//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHBhZ2VzLWRpci1ub2RlKS8uL3NyYy9wYWdlcy9fYXBwLnRzeCIsIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBMEI7QUFDSTtBQUNhO0FBRW1DO0FBQ3hDO0FBQ29CO0FBQ2U7QUFDL0I7QUFFMUMsTUFBTVUsWUFBWTtBQUVsQixNQUFNQyxTQUFTVix3RUFBZ0JBLENBQUM7SUFDOUJXLFNBQVM7SUFDVEY7SUFDQUcsUUFBUTtRQUFDVCxpREFBT0E7UUFBRUMsaURBQU9BO1FBQUVDLGtEQUFRQTtLQUFDO0lBQ3BDUSxLQUFLO0FBQ1A7QUFFQSxNQUFNQyxjQUFjLElBQUlSLDhEQUFXQTtBQUVuQyxTQUFTUyxNQUFNLEVBQUVDLFNBQVMsRUFBRUMsU0FBUyxFQUFZO0lBQy9DLHFCQUNFLDhEQUFDQztRQUFJQyxPQUFPO1lBQUVDLFlBQVlaLG1EQUFLQSxDQUFDYSxhQUFhO1lBQUVDLFdBQVc7WUFBU0MsVUFBVTtRQUFRO2tCQUNuRiw0RUFBQ3JCLGdEQUFhQTtZQUFDUSxRQUFRQTtzQkFDckIsNEVBQUNILHNFQUFtQkE7Z0JBQUNpQixRQUFRVjswQkFDM0IsNEVBQUNiLHNFQUFrQkE7OEJBQ2pCLDRFQUFDZTt3QkFBVyxHQUFHQyxTQUFTOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQU1wQztBQUVBLGlFQUFlRixLQUFLQSxFQUFDIiwic291cmNlcyI6WyIvaG9tZS9zdGVhay9EZXNrdG9wL2Z2Yy1wcm90b2NvbC9kYXBwL3NyYy9wYWdlcy9fYXBwLnRzeCJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgUmVhY3QgZnJvbSAncmVhY3QnO1xuaW1wb3J0ICdAL3N0eWxlcy9nbG9iYWxzLmNzcyc7XG5pbXBvcnQgJ0ByYWluYm93LW1lL3JhaW5ib3draXQvc3R5bGVzLmNzcyc7XG5pbXBvcnQgdHlwZSB7IEFwcFByb3BzIH0gZnJvbSAnbmV4dC9hcHAnO1xuaW1wb3J0IHsgZ2V0RGVmYXVsdENvbmZpZywgUmFpbmJvd0tpdFByb3ZpZGVyIH0gZnJvbSAnQHJhaW5ib3ctbWUvcmFpbmJvd2tpdCc7XG5pbXBvcnQgeyBXYWdtaVByb3ZpZGVyIH0gZnJvbSAnd2FnbWknO1xuaW1wb3J0IHsgbWFpbm5ldCwgcG9seWdvbiwgYXJiaXRydW0gfSBmcm9tICd3YWdtaS9jaGFpbnMnO1xuaW1wb3J0IHsgUXVlcnlDbGllbnQsIFF1ZXJ5Q2xpZW50UHJvdmlkZXIgfSBmcm9tICdAdGFuc3RhY2svcmVhY3QtcXVlcnknO1xuaW1wb3J0IHsgdGhlbWUgfSBmcm9tICdAL2NvbnN0YW50cy90aGVtZSc7XG5cbmNvbnN0IHByb2plY3RJZCA9ICc1NGQ3MDRhM2NjZGY1OWNlMjAzNjVmMTEyODExMjNiZCc7XG5cbmNvbnN0IGNvbmZpZyA9IGdldERlZmF1bHRDb25maWcoe1xuICBhcHBOYW1lOiAnRlZDIFByb3RvY29sJyxcbiAgcHJvamVjdElkLFxuICBjaGFpbnM6IFttYWlubmV0LCBwb2x5Z29uLCBhcmJpdHJ1bV0sXG4gIHNzcjogdHJ1ZSxcbn0pO1xuXG5jb25zdCBxdWVyeUNsaWVudCA9IG5ldyBRdWVyeUNsaWVudCgpO1xuXG5mdW5jdGlvbiBNeUFwcCh7IENvbXBvbmVudCwgcGFnZVByb3BzIH06IEFwcFByb3BzKSB7XG4gIHJldHVybiAoXG4gICAgPGRpdiBzdHlsZT17eyBiYWNrZ3JvdW5kOiB0aGVtZS5hcHBCYWNrZ3JvdW5kLCBtaW5IZWlnaHQ6ICcxMDB2aCcsIG1pbldpZHRoOiAnMTAwdncnIH19PlxuICAgICAgPFdhZ21pUHJvdmlkZXIgY29uZmlnPXtjb25maWd9PlxuICAgICAgICA8UXVlcnlDbGllbnRQcm92aWRlciBjbGllbnQ9e3F1ZXJ5Q2xpZW50fT5cbiAgICAgICAgICA8UmFpbmJvd0tpdFByb3ZpZGVyPlxuICAgICAgICAgICAgPENvbXBvbmVudCB7Li4ucGFnZVByb3BzfSAvPlxuICAgICAgICAgIDwvUmFpbmJvd0tpdFByb3ZpZGVyPlxuICAgICAgICA8L1F1ZXJ5Q2xpZW50UHJvdmlkZXI+XG4gICAgICA8L1dhZ21pUHJvdmlkZXI+XG4gICAgPC9kaXY+XG4gICk7XG59XG5cbmV4cG9ydCBkZWZhdWx0IE15QXBwOyAiXSwibmFtZXMiOlsiUmVhY3QiLCJnZXREZWZhdWx0Q29uZmlnIiwiUmFpbmJvd0tpdFByb3ZpZGVyIiwiV2FnbWlQcm92aWRlciIsIm1haW5uZXQiLCJwb2x5Z29uIiwiYXJiaXRydW0iLCJRdWVyeUNsaWVudCIsIlF1ZXJ5Q2xpZW50UHJvdmlkZXIiLCJ0aGVtZSIsInByb2plY3RJZCIsImNvbmZpZyIsImFwcE5hbWUiLCJjaGFpbnMiLCJzc3IiLCJxdWVyeUNsaWVudCIsIk15QXBwIiwiQ29tcG9uZW50IiwicGFnZVByb3BzIiwiZGl2Iiwic3R5bGUiLCJiYWNrZ3JvdW5kIiwiYXBwQmFja2dyb3VuZCIsIm1pbkhlaWdodCIsIm1pbldpZHRoIiwiY2xpZW50Il0sImlnbm9yZUxpc3QiOltdLCJzb3VyY2VSb290IjoiIn0=\n//# sourceURL=webpack-internal:///(pages-dir-node)/./src/pages/_app.tsx\n");

/***/ }),

/***/ "(pages-dir-node)/./src/styles/globals.css":
/*!********************************!*\
  !*** ./src/styles/globals.css ***!
  \********************************/
/***/ (() => {



/***/ }),

/***/ "@rainbow-me/rainbowkit":
/*!*****************************************!*\
  !*** external "@rainbow-me/rainbowkit" ***!
  \*****************************************/
/***/ ((module) => {

"use strict";
module.exports = import("@rainbow-me/rainbowkit");;

/***/ }),

/***/ "@tanstack/react-query":
/*!****************************************!*\
  !*** external "@tanstack/react-query" ***!
  \****************************************/
/***/ ((module) => {

"use strict";
module.exports = import("@tanstack/react-query");;

/***/ }),

/***/ "react":
/*!************************!*\
  !*** external "react" ***!
  \************************/
/***/ ((module) => {

"use strict";
module.exports = require("react");

/***/ }),

/***/ "react/jsx-dev-runtime":
/*!****************************************!*\
  !*** external "react/jsx-dev-runtime" ***!
  \****************************************/
/***/ ((module) => {

"use strict";
module.exports = require("react/jsx-dev-runtime");

/***/ }),

/***/ "wagmi":
/*!************************!*\
  !*** external "wagmi" ***!
  \************************/
/***/ ((module) => {

"use strict";
module.exports = import("wagmi");;

/***/ }),

/***/ "wagmi/chains":
/*!*******************************!*\
  !*** external "wagmi/chains" ***!
  \*******************************/
/***/ ((module) => {

"use strict";
module.exports = import("wagmi/chains");;

/***/ })

};
;

// load runtime
var __webpack_require__ = require("../webpack-runtime.js");
__webpack_require__.C(exports);
var __webpack_exec__ = (moduleId) => (__webpack_require__(__webpack_require__.s = moduleId))
var __webpack_exports__ = __webpack_require__.X(0, ["vendor-chunks/@rainbow-me"], () => (__webpack_exec__("(pages-dir-node)/./src/pages/_app.tsx")));
module.exports = __webpack_exports__;

})();