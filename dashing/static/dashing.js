/* global $, rivets, setInterval, alert, utils */

(function(global, console, getUrlParameter, insertUrlParam) {
    var Dashboard, Dashing, DashboardSet;
    Dashing = {
        utils: {
            loadTemplate: function(name, callback) {
                var src = $('link[rel=resource][data-widget=' + name + ']').attr('href');
                return $('<li class="widget widget-' + name + '">').load(src, callback); 
            },
            widgetInit: function(dashboard, widgetName) {
                'use strict';
                /* jshint camelcase: false, unused: false */
                return function() {
                    var self = this,
                        template = Dashing.utils.loadTemplate(widgetName, function() {
                            rivets.bind(template, {data: self.data});
                        }),
                        widget = dashboard.grid.add_widget(
                            template,
                            self.col,
                            self.row);
                };
            }
        },
        widgets: {}
    };
    DashboardSet = function(options) {
        'use strict';
        var self = this,
            app = $('#app'),
            scope = {
                dashboards: [],
                actions: [],
                swapDashboard: function(e, el) {
                    var name = el.dashboard.name,
                        dash = self.getDashboard(name);
                        $('.gridster:visible').hide(function() {
                            dash.show();
                            scope.showingOverlay = false;
                        });
                },
                hideOverlay: function(e) {
                    if (e.target.className === e.currentTarget.className) {
                        scope.showingOverlay = false;
                    }
                },
                toggleOverlay: function(e) {
                    if (e.which == 17) {
                        scope.showingOverlay = !scope.showingOverlay;
                    }
                }
            },
            init = function() {
                options = options || {};
                if (options.rollingChoices) {
                    scope.actions.push({
                        name: 'Rolling Time',
                        func: function(event, scope) {
                            if (!global.rollingMenu) {
                                global.rollingMenu = $(scope.action.template);
                                $(event.target).append(global.rollingMenu);
                                rivets.bind(global.rollingMenu, {action: scope.action});
                            }
                            global.rollingMenu.toggle();
                        },
                        template: (function() {
                            var choices = ['not rolling',
                                           '5 seconds',
                                           '30 seconds'],
                                bottomSpace = 57, html = '';

                            choices.forEach(function(text) {
                                html += $('<span class="rolling-option">').css({
                                        position: 'absolute',
                                        bottom: bottomSpace + 'px',
                                        right: '20px',
                                        display: 'none'
                                    }).attr({
                                        'rv-on-click': 'action.setRoll'
                                    }).text(text)[0].outerHTML;
                                bottomSpace += 30;
                            });
                            return html;
                        })(),
                        setRoll: function(e) {
                            var choices = {
                                    'not rolling': 0,
                                    '5 seconds': 5000,
                                    '30 seconds': 30000
                                };
                            setupRolling(choices[e.target.innerText]);
                            insertUrlParam('roll', choices[e.target.innerText]);
                            scope.showingOverlay = false;
                        }
                    });
                }
                rivets.bind(app, scope);
            },
            setupRolling = function(interval) {
                var set = scope.dashboards, parameterValue;
                if (set.length > 1) {
                    parameterValue = getUrlParameter('roll');
                    if (interval !== undefined || parameterValue !== null) {
                        interval = Number(interval) || Number(parameterValue);
                        if (isNaN(interval)) {
                            console.warn('roll parameter must be a number');
                            return;
                        }
                        clearInterval(global.rollingInterval);
                        if (interval !== 0) {
                            global.rollingInterval = setInterval(function() {
                                switchDashboards();
                            }, interval);
                        }
                    }
                }
            },
            switchDashboards = function() {
                var set = scope.dashboards,
                    currentDashboardId = set.map(function(e) {
                        return e.name;
                    }).indexOf(activeDashboardName),
                    nextDashboardId = currentDashboardId + 1 ==
                                        set.length ? 0 : currentDashboardId + 1,
                    newDashboardName = set[nextDashboardId].name;
                self.getDashboard(activeDashboardName).hide(function() {
                    self.getDashboard(newDashboardName).show();
                    activeDashboardName = newDashboardName;
                });
            },
            activeDashboardName = '',
            timeoutForDashboardsSet = null;
        this.addDashboard = function(name, options) {
            var set = scope.dashboards, dash;
            if (!name || typeof name !== 'string') {
                console.warn('You need to specify a name for the dashboard ' +
                             'and it must be a string');
                return;
            }
            options = options || {};
            options.name = name;
            options.hidden = Boolean(set.length);
            dash = new Dashboard(options);

            set.push(dash);
            if (timeoutForDashboardsSet !== null) {
                clearTimeout(timeoutForDashboardsSet);
            }
            timeoutForDashboardsSet = setTimeout(setupRolling, 1000);
            if (set.length === 1) activeDashboardName = name;
            return dash;
        };
        this.addAction = function(name, func) {
            if (typeof func !== 'function' ||
                typeof name !== 'string') return;
            scope.actions.push({
                name: name,
                func: func
            });
        };
        this.getDashboard = function(name) {
            var set = scope.dashboards;
            for (var i=0; i<set.length; i++) {
                if (set[i].hasOwnProperty('name') && set[i].name === name)
                    return set[i];
            }
        };
        init();
    };
    Dashboard = function (options) {
        'use strict';
        /* jshint camelcase: false */
        var self = this,
            init = function () {
                options = options || {};
                var $wrapper = $('<div class="gridster"><ul></ul></div>');
                if (!options.hidden) {
                    $wrapper.css('display', 'block');
                }
                $wrapper.css({
                    width: options.viewportWidth ? options.viewportWidth +
                                                'px' : $(window).width() + 'px',
                    height: options.viewportHeight ?
                        options.viewportHeight + 'px' : $(window).height() + 'px'
                });
                
                self.grid = $wrapper.find('ul').gridster({
                    widget_margins: options.widgetMargins || [5, 5],
                    widget_base_dimensions: options.widgetBaseDimensions || [370, 340]
                }).data('gridster');
                
                $(options.selector || '#container').append($wrapper);

                self.widgets = {};
                for (var key in Dashing.widgets) {
                    self.widgets[key] = Dashing.widgets[key];
                }
            },
            widgetSet = [];
        this.name = options ? options.name : 'unnamed';
        this.show = function(func) {
            self.grid.$wrapper.fadeIn(func);
        };
        this.hide = function(func) {
            self.grid.$wrapper.fadeOut(func);
        };
        this.grid = undefined;
        this.addWidget = function (name, type, options) {
            var widget;

            if (self.widgets && self.widgets[type]) {
                widget = new self.widgets[type](self);
            }
            else {
                console.error('widget ' + type + ' does not exist');
                return;
            }

            $.extend(widget, options);
            if (widget.__init__) widget.__init__();

            widgetSet.push({
                name: name,
                type: type,
                widget: widget
            });

            self.subscribe(name + '/getData', widget.getData.bind(widget));
            self.publish(name + '/getData');
            setInterval(function () {
                self.publish(name + '/getData');
            }, widget.interval || 1000);
        };
        this.listWidgets = function() {
            return widgetSet;
        };
        this.subscribe = function(id, func) {
            $(document).on(id, function(e, args){
                func.apply(this, args);
            });
        };
        this.publish = function(id, args) {
            $(document).trigger(id, args);
        };
        init();
    };
    global.Dashing = Dashing;
    global.Dashboard = Dashboard;
    global.DashboardSet = DashboardSet;
})(window, window.console || {warn: alert.bind(null), error: alert.bind(null)},
   utils.getUrlParameter, utils.insertUrlParam);

// rivets formatters
rivets.binders.fade = function(el, value) {
    /* jshint -W030 */
    value ? $(el).fadeIn() : $(el).fadeOut();
};
