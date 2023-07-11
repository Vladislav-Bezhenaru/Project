ymaps.ready(function () {
    myMap = new ymaps.Map('map', {
            center: [54.854092, 38.559833],
            zoom: 15,
            controls: ['routeButtonControl','zoomControl','smallMapDefaultSet'] 
        }, {
            searchControlProvider: 'yandex#search'
        });
        /**
         *  @see https://api.yandex.ru/maps/doc/jsapi/2.1/ref/reference/multiRouter.MultiRoute.xml
         */
        myPlacemark = new ymaps.Placemark(myMap.getCenter(), {
            hintContent: 'Озеры',
            balloonContentHeader: 'Озеры',
            balloonContentBody: '<img src = images/Ozery.jpg width = 400 height = 200> <br> <b>Дата основания:</b> 1834 г. <br> <b>Население: </b>'+
            '24 653 чел (2020 г.) <br> <b>Телефонный код:</b> +7 49670 <br> <b>Площадь:</b> 12км<sup>2</sup>'
        }, {
            // Опции.
            // Необходимо указать данный тип макета.
            iconLayout: 'default#image',
            // Своё изображение иконки метки.
            iconImageHref: 'images/placeholder.svg',
            // Размеры метки.
            iconImageSize: [30, 42],
            // Смещение левого верхнего угла иконки относительно
            // её "ножки" (точки привязки).
            iconImageOffset: [-5, -45]
        });

        //Создание коллекции для поиска по собственным объектам и заполняем её данным из ajax запроса
        let myPoints = [];
        function getFile () {

            var request = new XMLHttpRequest();

            request.open('GET', 'JSON/data.json');

            request.onloadend = function() {

                parse(request.responseText);
            }

            request.send();
        }

        getFile();

        function parse(obj) {

            DATA = JSON.parse(obj);

            // console.log(DATA.features);
            for (let i = 0; i<DATA.features.length;i++) {
                myPoints.push(new Object());
                myPoints[i].coords = DATA.features[i].geometry.coordinates;
                myPoints[i].text = DATA.features[i].properties.hintContent;
            }
            console.log(myPoints);

            let mySearchControl = new ymaps.control.SearchControl({
                options: {
                    provider: new CustomSearchProvider(myPoints),
                    noPlacemark: true,
                    resultsPerPage:5
                }
            });

            myMap.controls.add(mySearchControl,{float:'right'});
        }
        

        function CustomSearchProvider(points) {
            this.points = points;
            // console.log(this.points);
        }

        CustomSearchProvider.prototype.geocode = function (request, options) {
            var deferred = new ymaps.vow.defer(),
                geoObjects = new ymaps.GeoObjectCollection(),
            // Сколько результатов нужно пропустить.
                offset = options.skip || 0,
            // Количество возвращаемых результатов.
                limit = options.results || 20;
                
            var points = [];
            // Ищем в свойстве text каждого элемента массива.
            for (var i = 0, l = this.points.length; i < l; i++) {
                var point = this.points[i];
                if (point.text.toLowerCase().indexOf(request.toLowerCase()) != -1) {
                    points.push(point);
                }
            }
            // При формировании ответа можно учитывать offset и limit.
            points = points.splice(offset, limit);
            // Добавляем точки в результирующую коллекцию.
            for (var i = 0, l = points.length; i < l; i++) {
                var point = points[i],
                    coords = point.coords,
                            text = point.text;
        
                geoObjects.add(new ymaps.Placemark(coords, {
                    name: text,
                    description: text
                    // balloonContentBody: '<p>' + text + '</p>',
                    // boundedBy: [coords, coords]
                }));
            }
        
            deferred.resolve({
                // Геообъекты поисковой выдачи.
                geoObjects: geoObjects,
                // Метаинформация ответа.
                metaData: {
                    geocoder: {
                        // Строка обработанного запроса.
                        request: request,
                        // Количество найденных результатов.
                        found: geoObjects.getLength(),
                        // Количество возвращенных результатов.
                        results: limit,
                        // Количество пропущенных результатов.
                        skip: offset
                    }
                }
            });
        
            // Возвращаем объект-обещание.
            return deferred.promise();
        };

        let Route = new ymaps.multiRouter.MultiRoute ({
            referencePoints: [
                [54.853496, 38.557372],
                "Текстильщики, д. 24, кв. 3"
            ],
            params: {results:1}
        },{
            boundsAutoApply: true
        });

        objectManager = new ymaps.ObjectManager({
            // Чтобы метки начали кластеризоваться, выставляем опцию.
            clusterize: true,
            // ObjectManager принимает те же опции, что и кластеризатор.
            gridSize: 64,
            // Макет метки кластера pieChart.
            clusterIconLayout: "default#pieChart"
        });


        let listBoxItems = ['Пятерочки','Школы','Озерская ЦРБ']
        .map(function (title) {
            return new ymaps.control.ListBoxItem({
                data: {
                    content: title
                },
                state: {
                    selected: true
                }
            })
        }),
    reducer = function (filters, filter) {
        filters[filter.data.get('content')] = filter.isSelected();
        return filters;
    },
    // Теперь создадим список, содержащий 5 пунктов.
    listBoxControl = new ymaps.control.ListBox({
        data: {
            content: 'Фильтр',
            title: 'Фильтр'
        },
        items: listBoxItems,
        state: {
            // Признак, развернут ли список.
            expanded: true,
            filters: listBoxItems.reduce(reducer, {})
        }
    });

        // Добавим отслеживание изменения признака, выбран ли пункт списка.
        listBoxControl.events.add(['select', 'deselect'], function (e) {
            var listBoxItem = e.get('target');
            var filters = ymaps.util.extend({}, listBoxControl.state.get('filters'));
            filters[listBoxItem.data.get('content')] = listBoxItem.isSelected();
            listBoxControl.state.set('filters', filters);
        });
    
        var filterMonitor = new ymaps.Monitor(listBoxControl.state);
        filterMonitor.add('filters', function (filters) {
            // Применим фильтр.
            objectManager.setFilter(getFilterFunction(filters));
        });
    
        function getFilterFunction(categories) {
            return function (obj) {
                var content = obj.name;
                console.log(obj);
                return categories[content]
            }
        }

    myMap.controls
    .add(listBoxControl)

    myMap.geoObjects
        .add(myPlacemark)
        .add(objectManager)
        .add(Route)
        .add(new ymaps.Placemark([54.853245,38.557285],{
            hintContent:'Автостанция Озеры',
            balloonContentHeader: 'Автостанция Озёры',
            balloonContentBody: '<img src = "images/autoStation.jpg" height = "250" width = "250"> <br>' +
            '<b>Адресс</b> <br> ул. Ленина, 45, Озеры, Россия <br> <b>Контакты</b> 8 (800) 700-31-13'
        },{
            iconLayout: 'default#image',
            // iconColor: 'blue',
            iconImageHref: 'images/BusWhite.png',
            iconImageSize: [30,30]
            // iconImageOffset: [-245,85]
        }));


        $.ajax({
            url: "JSON/data.json"
        }).done(function (data) {
            // console.log(data);
            // console.log(data.features[0].name);
            objectManager.add(data);
        });
        
});