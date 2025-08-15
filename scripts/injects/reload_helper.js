(function () {
	if (typeof window !== 'undefined' && typeof window.setupReloadDataExtraction === 'function') {
		console.log('[ReloadHelper] setupReloadDataExtraction 已存在，跳过注入');
		return;
	}

	try {
		window.setupReloadDataExtraction = function (extractFunction, scriptName) {
			scriptName = scriptName || 'Unknown';
			if (typeof extractFunction !== 'function') {
				console.warn('[' + scriptName + '] extractFunction 必须是函数');
				return;
			}

			function executeDataExtraction() {
				try {
					console.info('[' + scriptName + '] 执行数据提取');
					extractFunction();
				} catch (error) {
					console.error('[' + scriptName + '] 数据提取失败:', error);
				}
			}

			if (document.readyState === 'loading') {
				window.addEventListener('load', function () {
					console.info('[' + scriptName + '] 页面加载完成，延迟执行数据提取');
					setTimeout(executeDataExtraction, 1000);
				});
			} else {
				setTimeout(executeDataExtraction, 1000);
			}

			window.addEventListener('__COLLECT_PLUGIN_RELOAD_COMPLETE__', function (event) {
				console.info('[' + scriptName + '] 检测到脚本重新注入完成，重新执行数据提取', event && event.detail);
				setTimeout(executeDataExtraction, 200);
			});

			if (window.__COLLECT_PLUGIN_RELOAD__) {
				console.info('[' + scriptName + '] 检测到脚本重新注入，立即执行数据提取');
				setTimeout(executeDataExtraction, 500);
			}

			console.info('[' + scriptName + '] 重新注入数据提取机制设置完成');
		};

		window.__COLLECT_RELOAD_HELPER_READY__ = true;
		console.log('[ReloadHelper] 注入完成，setupReloadDataExtraction 已可用');
	} catch (e) {
		console.error('[ReloadHelper] 注入失败:', e);
	}
})();


