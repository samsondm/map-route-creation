import parseTranslate from './parseTranslate';

test.each`
translate                                   | expected
${'translate( 0 )'}                         | ${{ x: 0, y: 0, z: 0 }}
${'translate( 0, 0)'}                       | ${{ x: 0, y: 0, z: 0 }}
${'translate3d( 0  , 0 , 0 )'}              | ${{ x: 0, y: 0, z: 0 }}
${'translate3d( 0.1px  , .8px , 0 )'}       | ${{ x: 0.1, y: 0.8, z: 0 }}
${'translateX(1px)'}                        | ${{ x: 1, y: 0, z: 0 }}
${'translateY(-1px)'}                       | ${{ x: 0, y: -1, z: 0 }}
${'translateZ(7px)'}                        | ${{ x: 0, y: 0, z: 7 }}
${'translate( .3px , .21px)'}               | ${{ x: 0.3, y: 0.21, z: 0 }}
${'translate3d(-1px, 0.1px)'}               | ${{ x: -1, y: 0.1, z: 0 }}
${'translate3d(-0.1px, -4.645px, 0.3px)'}   | ${{ x: -0.1, y: -4.645, z: 0.3 }}
${'translate3d(26px, 54px, 0px)'}           | ${{ x: 26, y: 54, z: 0 }}
${'tranlateX(0px)'}                         | ${null}
${'tranlateX(-15 px)'}                      | ${null}
${'tranlateX(-40px, 0)'}                    | ${null}
${'translate(20, z)'}                       | ${null}
${'translate(20, 0, 5)'}                    | ${null}
${'translate3z(20)'}                        | ${null}
`('parseTranslate transforms translate to object', ({ translate, expected }) => {
    expect(parseTranslate(translate)).toEqual(expected);
  });