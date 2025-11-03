import express from 'express';
import { productController } from '../controllers/product-controller.js';
import { validation } from '../middlewares/validation.js';
import authenticate from '../middlewares/authenticate.js';
import { isProductOwner } from '../middlewares/authorize.js';

const router = express.Router();

// 상품 조회, 등록
router
  .route('/')
  .get(productController.getAllProducts)
  .post(
    authenticate,
    validation.validate(validation.productSchema),
    productController.createProduct
  );

// 상품 상세 조회, 수정, 삭제
router
  .route('/:id')
  .get(
    validation.validateParam('id', validation.idSchema),
    productController.getProductById
  )
  .patch(
    authenticate,
    validation.validateParam('id', validation.idSchema),
    isProductOwner,
    validation.validate(validation.productUpdateSchema),
    productController.updateProduct
  )
  .delete(
    authenticate,
    validation.validateParam('id', validation.idSchema),
    isProductOwner,
    productController.deleteProduct
  );

// 상품 좋아요, 좋아요 취소
router
  .route('/:id/like')
  .post(
    authenticate,
    validation.validateParam('id', validation.idSchema),
    productController.likeProduct
  )
  .delete(
    authenticate,
    validation.validateParam('id', validation.idSchema),
    productController.unlikeProduct
  );

router.patch(
  '/:id/price',
  authenticate,
  validation.validateParam('id', validation.idSchema),
  isProductOwner, // 작성자만 가격 조정 가능하게 할 거면 유지
  validation.validate(
    // 간단히 newPrice만 받도록 별도 스키마 만드는 게 이상적.
    // 임시로 { newPrice: number }만 체크하는 스키마 있다 치고
    validation.productPriceUpdateSchema
  ),
  productController.updateProductPrice
);

export default router;
